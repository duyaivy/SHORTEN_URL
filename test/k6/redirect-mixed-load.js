import http from "k6/http";
import { check, fail, sleep } from "k6";
import { Counter, Rate, Trend } from "k6/metrics";

const BASE_URL = (__ENV.BASE_URL || "https://url.duyaivy.id.vn").replace(
  /\/+$/,
  "",
);
const HOT_ALIASES = aliasesFromEnv("HOT_ALIASES");
const COLD_ALIASES = aliasesFromEnv("COLD_ALIASES");
const HOT_TRAFFIC_PERCENT = numberFromEnv("HOT_TRAFFIC_PERCENT", 80, 1, 99);
const REQUEST_INTERVAL_SECONDS = numberFromEnv(
  "REQUEST_INTERVAL_SECONDS",
  1,
  0,
);

const redirectSuccessRate = new Rate("redirect_success_rate");
const hotRedirectSuccessRate = new Rate("hot_redirect_success_rate");
const coldRedirectSuccessRate = new Rate("cold_redirect_success_rate");
const unavailableRedirectRate = new Rate("unavailable_redirect_rate");
const rateLimitedRate = new Rate("rate_limited_rate");
const serverErrorRate = new Rate("server_error_rate");
const unexpectedStatusRate = new Rate("unexpected_status_rate");
const hotRedirectDuration = new Trend("hot_redirect_duration", true);
const coldRedirectDuration = new Trend("cold_redirect_duration", true);
const hotRequestCount = new Counter("hot_request_count");
const coldRequestCount = new Counter("cold_request_count");
const rateLimited429Count = new Counter("rate_limited_429_count");
const server5xxCount = new Counter("server_5xx_count");

const hotP95ThresholdMs = numberFromEnv("HOT_P95_THRESHOLD_MS", 500, 1);
const coldP95ThresholdMs = numberFromEnv("COLD_P95_THRESHOLD_MS", 1000, 1);
const p99ThresholdMs = numberFromEnv("P99_THRESHOLD_MS", 1500, 1);
const maxServerErrorRate = numberFromEnv("MAX_SERVER_ERROR_RATE", 0.01, 0, 1);
const maxRateLimitedRate = numberFromEnv("MAX_RATE_LIMITED_RATE", 0.001, 0, 1);

// Nest does not throttle the public redirect route. Keep 429 visible as its own
// metric because an ingress, CDN, WAF, or an older deployment can still emit it.
http.setResponseCallback(http.expectedStatuses(302, 429));

export const options = {
  discardResponseBodies: true,
  summaryTrendStats: ["avg", "min", "med", "max", "p(90)", "p(95)", "p(99)"],
  stages: [
    {
      duration: __ENV.WARMUP_DURATION || "30s",
      target: integerFromEnv("WARMUP_VUS", 5, 1),
    },
    {
      duration: __ENV.LOW_DURATION || "1m",
      target: integerFromEnv("LOW_VUS", 20, 1),
    },
    {
      duration: __ENV.MODERATE_DURATION || "1m",
      target: integerFromEnv("MODERATE_VUS", 50, 1),
    },
    {
      duration: __ENV.HIGH_DURATION || "1m",
      target: integerFromEnv("HIGH_VUS", 100, 1),
    },
    {
      duration: __ENV.SUSTAIN_DURATION || "2m",
      target: integerFromEnv("SUSTAIN_VUS", 100, 1),
    },
    { duration: __ENV.RAMP_DOWN_DURATION || "30s", target: 0 },
  ],
  thresholds: {
    http_req_failed: [`rate<${maxServerErrorRate}`],
    redirect_success_rate: ["rate>0.99"],
    hot_redirect_success_rate: ["rate>0.99"],
    cold_redirect_success_rate: ["rate>0.99"],
    hot_redirect_duration: [
      `p(95)<${hotP95ThresholdMs}`,
      `p(99)<${p99ThresholdMs}`,
    ],
    cold_redirect_duration: [
      `p(95)<${coldP95ThresholdMs}`,
      `p(99)<${p99ThresholdMs}`,
    ],
    unavailable_redirect_rate: ["rate<0.01"],
    rate_limited_rate: [`rate<${maxRateLimitedRate}`],
    server_error_rate: [`rate<${maxServerErrorRate}`],
    unexpected_status_rate: [`rate<${maxServerErrorRate}`],
  },
};

export function setup() {
  validateConfiguration();

  // Only validate one representative from each pool. Validating the whole cold
  // pool here would warm every cache entry before the measured scenario starts.
  validateRepresentative(HOT_ALIASES[0], "hot");
  validateRepresentative(COLD_ALIASES[0], "cold");

  console.log(
    `Mixed redirect test: ${HOT_TRAFFIC_PERCENT}% hot traffic across ` +
      `${HOT_ALIASES.length} hot aliases; ${100 - HOT_TRAFFIC_PERCENT}% ` +
      `cold/long-tail traffic across ${COLD_ALIASES.length} aliases.`,
  );
}

export default function () {
  const isHot = Math.random() * 100 < HOT_TRAFFIC_PERCENT;
  const aliases = isHot ? HOT_ALIASES : COLD_ALIASES;
  const alias = isHot
    ? aliases[Math.floor(Math.random() * aliases.length)]
    : aliases[((__VU - 1) * 131 + __ITER) % aliases.length];
  const trafficClass = isHot ? "hot" : "cold";

  const response = http.get(`${BASE_URL}/${encodeURIComponent(alias)}`, {
    redirects: 0,
    tags: {
      endpoint: "public_redirect",
      phase: "load",
      traffic_class: trafficClass,
    },
  });

  recordResponse(response, isHot);

  if (REQUEST_INTERVAL_SECONDS > 0) sleep(REQUEST_INTERVAL_SECONDS);
}

function recordResponse(response, isHot) {
  const is302 = response.status === 302;
  const is429 = response.status === 429;
  const is5xx = response.status >= 500 && response.status <= 599;
  const isNetworkError = response.status === 0;
  const location = response.headers.Location || "";
  const pointsToUnavailable = isUnavailableRedirect(location);
  const isValidRedirect = is302 && Boolean(location) && !pointsToUnavailable;

  redirectSuccessRate.add(isValidRedirect);
  unavailableRedirectRate.add(is302 && pointsToUnavailable);
  rateLimitedRate.add(is429);
  serverErrorRate.add(is5xx || isNetworkError);
  unexpectedStatusRate.add(!is302 && !is429);

  if (isHot) {
    hotRequestCount.add(1);
    hotRedirectSuccessRate.add(isValidRedirect);
    if (isValidRedirect) hotRedirectDuration.add(response.timings.duration);
  } else {
    coldRequestCount.add(1);
    coldRedirectSuccessRate.add(isValidRedirect);
    if (isValidRedirect) coldRedirectDuration.add(response.timings.duration);
  }

  if (is429) rateLimited429Count.add(1);
  if (is5xx) server5xxCount.add(1);

  check(response, {
    "response is HTTP 302": (res) => res.status === 302,
    "Location header exists": (res) => Boolean(res.headers.Location),
    "redirect does not target unavailable page": () =>
      !is302 || !pointsToUnavailable,
    "response is not 5xx": (res) => res.status < 500 || res.status > 599,
  });
}

function validateRepresentative(alias, trafficClass) {
  const url = `${BASE_URL}/${encodeURIComponent(alias)}`;
  const response = http.get(url, {
    redirects: 0,
    tags: {
      endpoint: "public_redirect",
      phase: "setup_validation",
      traffic_class: trafficClass,
    },
  });
  const location = response.headers.Location || "";

  if (response.status !== 302 || !location || isUnavailableRedirect(location)) {
    fail(
      `${trafficClass} alias validation failed for ${url}: expected an ` +
        `available HTTP 302 redirect, received status ${response.status || 0} ` +
        `and Location "${location}". No load was started.`,
    );
  }
}

function validateConfiguration() {
  if (!/^https?:\/\//i.test(BASE_URL)) {
    fail(`BASE_URL must start with http:// or https://; received ${BASE_URL}`);
  }
  if (HOT_ALIASES.length === 0) {
    fail("HOT_ALIASES must contain at least one alias.");
  }
  if (COLD_ALIASES.length === 0) {
    fail("COLD_ALIASES must contain at least one alias.");
  }

  const aliases = HOT_ALIASES.concat(COLD_ALIASES);
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
