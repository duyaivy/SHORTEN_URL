import http from "k6/http";
import { check, fail, sleep } from "k6";
import { Counter, Rate, Trend } from "k6/metrics";

const BASE_URL = (__ENV.BASE_URL || "https://url.duyaivy.id.vn").replace(
  /\/+$/,
  "",
);
const MISSING_ALIASES = aliasesFromEnv("MISSING_ALIASES");
const INACTIVE_ALIASES = aliasesFromEnv("INACTIVE_ALIASES");
const EXPIRED_ALIASES = aliasesFromEnv("EXPIRED_ALIASES");
const NEGATIVE_GROUPS = [
  { type: "missing", aliases: MISSING_ALIASES },
  { type: "inactive", aliases: INACTIVE_ALIASES },
  { type: "expired", aliases: EXPIRED_ALIASES },
].filter((group) => group.aliases.length > 0);
const REQUEST_INTERVAL_SECONDS = numberFromEnv(
  "REQUEST_INTERVAL_SECONDS",
  1,
  0,
);
const TEST_PROFILE = (__ENV.TEST_PROFILE || "load").toLowerCase();
const LOAD_PROFILE = negativeProfile(TEST_PROFILE);

const unavailableRedirectSuccessRate = new Rate(
  "unavailable_redirect_success_rate",
);
const validLocationRate = new Rate("valid_location_rate");
const unexpectedAvailableRedirectRate = new Rate(
  "unexpected_available_redirect_rate",
);
const rateLimitedRate = new Rate("rate_limited_rate");
const serverErrorRate = new Rate("server_error_rate");
const unexpectedStatusRate = new Rate("unexpected_status_rate");
const unavailableRedirectDuration = new Trend(
  "unavailable_redirect_duration",
  true,
);
const missingRequestCount = new Counter("missing_request_count");
const inactiveRequestCount = new Counter("inactive_request_count");
const expiredRequestCount = new Counter("expired_request_count");
const rateLimited429Count = new Counter("rate_limited_429_count");
const server5xxCount = new Counter("server_5xx_count");

const p95ThresholdMs = numberFromEnv("P95_THRESHOLD_MS", 750, 1);
const p99ThresholdMs = numberFromEnv("P99_THRESHOLD_MS", 1500, 1);
const maxServerErrorRate = numberFromEnv("MAX_SERVER_ERROR_RATE", 0.01, 0, 1);
const maxRateLimitedRate = numberFromEnv("MAX_RATE_LIMITED_RATE", 0.001, 0, 1);

http.setResponseCallback(http.expectedStatuses(302, 429));

export const options = {
  discardResponseBodies: true,
  tags: { test_profile: TEST_PROFILE },
  summaryTrendStats: ["avg", "min", "med", "max", "p(90)", "p(95)", "p(99)"],
  stages: [
    {
      duration: __ENV.WARMUP_DURATION || LOAD_PROFILE.warmupDuration,
      target: integerFromEnv("WARMUP_VUS", LOAD_PROFILE.warmupVUs, 1),
    },
    {
      duration: __ENV.LOW_DURATION || LOAD_PROFILE.lowDuration,
      target: integerFromEnv("LOW_VUS", LOAD_PROFILE.lowVUs, 1),
    },
    {
      duration: __ENV.HIGH_DURATION || LOAD_PROFILE.highDuration,
      target: integerFromEnv("HIGH_VUS", LOAD_PROFILE.highVUs, 1),
    },
    {
      duration: __ENV.SUSTAIN_DURATION || LOAD_PROFILE.sustainDuration,
      target: integerFromEnv("SUSTAIN_VUS", LOAD_PROFILE.sustainVUs, 1),
    },
    {
      duration: __ENV.RAMP_DOWN_DURATION || LOAD_PROFILE.rampDownDuration,
      target: 0,
    },
  ],
  thresholds: {
    http_req_failed: [`rate<${maxServerErrorRate}`],
    unavailable_redirect_success_rate: ["rate>0.99"],
    valid_location_rate: ["rate>0.99"],
    unexpected_available_redirect_rate: ["rate<0.01"],
    unavailable_redirect_duration: [
      `p(95)<${p95ThresholdMs}`,
      `p(99)<${p99ThresholdMs}`,
    ],
    rate_limited_rate: [`rate<${maxRateLimitedRate}`],
    server_error_rate: [`rate<${maxServerErrorRate}`],
    unexpected_status_rate: [`rate<${maxServerErrorRate}`],
  },
};

export function setup() {
  validateConfiguration();

  // Deliberately do not request aliases in setup: the first measured requests
  // should exercise the negative-cache miss path before the 60-second sentinel.
  console.log(
    `Negative redirect test: ${MISSING_ALIASES.length} missing, ` +
      `${INACTIVE_ALIASES.length} inactive, and ` +
      `${EXPIRED_ALIASES.length} expired aliases. ` +
      `Running the "${TEST_PROFILE}" profile.`,
  );
}

export default function () {
  // Rotate evenly through configured categories so a large missing pool does
  // not starve a smaller inactive or expired pool of traffic.
  const group = NEGATIVE_GROUPS[(__VU - 1 + __ITER) % NEGATIVE_GROUPS.length];
  const alias =
    group.aliases[((__VU - 1) * 131 + __ITER) % group.aliases.length];
  const response = http.get(`${BASE_URL}/${encodeURIComponent(alias)}`, {
    redirects: 0,
    tags: {
      endpoint: "public_redirect",
      phase: "load",
      negative_type: group.type,
    },
  });

  const is302 = response.status === 302;
  const is429 = response.status === 429;
  const is5xx = response.status >= 500 && response.status <= 599;
  const isNetworkError = response.status === 0;
  const location = response.headers.Location || "";
  const pointsToUnavailable = isUnavailableRedirect(location);
  const isExpectedRedirect = is302 && Boolean(location) && pointsToUnavailable;
  const unexpectedlyAvailable =
    is302 && Boolean(location) && !pointsToUnavailable;

  unavailableRedirectSuccessRate.add(isExpectedRedirect);
  validLocationRate.add(is302 && Boolean(location));
  unexpectedAvailableRedirectRate.add(unexpectedlyAvailable);
  rateLimitedRate.add(is429);
  serverErrorRate.add(is5xx || isNetworkError);
  unexpectedStatusRate.add(!is302 && !is429);

  if (isExpectedRedirect) {
    unavailableRedirectDuration.add(response.timings.duration);
  }
  if (group.type === "missing") missingRequestCount.add(1);
  if (group.type === "inactive") inactiveRequestCount.add(1);
  if (group.type === "expired") expiredRequestCount.add(1);
  if (is429) rateLimited429Count.add(1);
  if (is5xx) server5xxCount.add(1);

  check(response, {
    "response is HTTP 302": (res) => res.status === 302,
    "Location header exists": (res) => Boolean(res.headers.Location),
    "redirect targets unavailable page": () => isExpectedRedirect,
    "negative alias did not expose a destination": () => !unexpectedlyAvailable,
    "response is not 5xx": (res) => res.status < 500 || res.status > 599,
  });

  if (REQUEST_INTERVAL_SECONDS > 0) sleep(REQUEST_INTERVAL_SECONDS);
}

function validateConfiguration() {
  if (!/^https?:\/\//i.test(BASE_URL)) {
    fail(`BASE_URL must start with http:// or https://; received ${BASE_URL}`);
  }
  if (
    MISSING_ALIASES.length === 0 &&
    INACTIVE_ALIASES.length === 0 &&
    EXPIRED_ALIASES.length === 0
  ) {
    fail(
      "Provide at least one alias through MISSING_ALIASES, " +
        "INACTIVE_ALIASES, or EXPIRED_ALIASES.",
    );
  }

  const aliases = MISSING_ALIASES.concat(INACTIVE_ALIASES, EXPIRED_ALIASES);
  const invalid = aliases.filter((alias) => !/^[a-zA-Z0-9]{4,20}$/.test(alias));
  if (invalid.length > 0) {
    fail(
      `Every alias must be 4-20 ASCII letters or digits. Invalid aliases: ` +
        invalid.join(", "),
    );
  }
}

function aliasesFromEnv(name) {
  const raw = __ENV[name] || "";
  const aliases = raw
    .split(",")
    .map((alias) => alias.trim())
    .filter(Boolean);
  return Array.from(new Set(aliases));
}

function isUnavailableRedirect(location) {
  return location
    .split(/[?#]/, 1)[0]
    .replace(/\/+$/, "")
    .endsWith("/link-unavailable");
}

function negativeProfile(name) {
  const profiles = {
    smoke: {
      warmupVUs: 1,
      warmupDuration: "5s",
      lowVUs: 2,
      lowDuration: "10s",
      highVUs: 5,
      highDuration: "10s",
      sustainVUs: 5,
      sustainDuration: "15s",
      rampDownDuration: "5s",
    },
    load: {
      warmupVUs: 5,
      warmupDuration: "15s",
      lowVUs: 15,
      lowDuration: "30s",
      highVUs: 50,
      highDuration: "45s",
      sustainVUs: 50,
      sustainDuration: "90s",
      rampDownDuration: "15s",
    },
    stress: {
      warmupVUs: 10,
      warmupDuration: "15s",
      lowVUs: 50,
      lowDuration: "30s",
      highVUs: 150,
      highDuration: "45s",
      sustainVUs: 150,
      sustainDuration: "90s",
      rampDownDuration: "15s",
    },
  };
  const profile = profiles[name];
  if (!profile) {
    throw new Error(
      `TEST_PROFILE must be smoke, load, or stress; received ${name}`,
    );
  }
  return profile;
}

function integerFromEnv(name, fallback, minimum) {
  const value = numberFromEnv(name, fallback, minimum);
  if (!Number.isInteger(value)) {
    throw new Error(`${name} must be an integer; received ${value}`);
  }
  return value;
}

function numberFromEnv(name, fallback, minimum, maximum) {
  if (__ENV[name] === undefined || __ENV[name] === "") return fallback;

  const value = Number(__ENV[name]);
  if (
    !Number.isFinite(value) ||
    value < minimum ||
    (maximum !== undefined && value > maximum)
  ) {
    const range =
      maximum === undefined ? `>= ${minimum}` : `${minimum}-${maximum}`;
    throw new Error(
      `${name} must be a number in ${range}; received ${__ENV[name]}`,
    );
  }
  return value;
}
