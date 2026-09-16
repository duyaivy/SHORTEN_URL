import http from "k6/http";
import { check, fail, sleep } from "k6";
import { Counter, Rate, Trend } from "k6/metrics";

const BASE_URL = (__ENV.BASE_URL || "https://url.duyaivy.id.vn").replace(
  /\/+$/,
  "",
);
const TEST_ALIAS = __ENV.TEST_ALIAS || "abc123";
const TEST_URL = `${BASE_URL}/${encodeURIComponent(TEST_ALIAS)}`;
const EXPECTED_LOCATION = __ENV.EXPECTED_LOCATION || "";
const REQUEST_INTERVAL_SECONDS = numberFromEnv(
  "REQUEST_INTERVAL_SECONDS",
  1,
  0,
);

const redirectSuccessRate = new Rate("redirect_success_rate");
const validLocationRate = new Rate("redirect_valid_location_rate");
const validTargetRate = new Rate("redirect_valid_target_rate");
const rateLimitedRate = new Rate("rate_limited_rate");
const serverErrorRate = new Rate("server_error_rate");
const unexpectedStatusRate = new Rate("unexpected_status_rate");
const redirectDuration = new Trend("redirect_duration", true);
const redirect302Count = new Counter("redirect_302_count");
const rateLimited429Count = new Counter("rate_limited_429_count");
const server5xxCount = new Counter("server_5xx_count");

const p95ThresholdMs = numberFromEnv("P95_THRESHOLD_MS", 500, 1);
const p99ThresholdMs = numberFromEnv("P99_THRESHOLD_MS", 1000, 1);
const maxServerErrorRate = numberFromEnv("MAX_SERVER_ERROR_RATE", 0.01, 0);
const maxRateLimitedRate = numberFromEnv("MAX_RATE_LIMITED_RATE", 0.001, 0);

// Nest skips throttling for public redirects. Keep a possible upstream 429 out
// of http_req_failed and expose it through dedicated metrics instead.
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
    http_req_duration: [`p(95)<${p95ThresholdMs}`, `p(99)<${p99ThresholdMs}`],
    redirect_success_rate: ["rate>0.99"],
    redirect_duration: [`p(95)<${p95ThresholdMs}`, `p(99)<${p99ThresholdMs}`],
    redirect_valid_location_rate: ["rate>0.99"],
    redirect_valid_target_rate: ["rate>0.99"],
    rate_limited_rate: [`rate<${maxRateLimitedRate}`],
    server_error_rate: [`rate<${maxServerErrorRate}`],
    unexpected_status_rate: [`rate<${maxServerErrorRate}`],
  },
};

export function setup() {
  validateConfiguration();

  const response = http.get(TEST_URL, {
    redirects: 0,
    tags: { endpoint: "public_redirect", phase: "setup_validation" },
  });
  const location = response.headers.Location || "";

  if (response.status !== 302) {
    fail(
      `Alias validation failed for ${TEST_URL}: expected HTTP 302, received ` +
        `${response.status || "a network error"}. No load was started.`,
    );
  }

  if (!location) {
    fail(
      `Alias validation failed for ${TEST_URL}: the HTTP 302 has no Location header.`,
    );
  }

  if (isUnavailableRedirect(location)) {
    fail(
      `Alias validation failed for ${TEST_URL}: it redirects to the application's ` +
        `unavailable page (${location}). Choose an existing, active, unexpired alias.`,
    );
  }

  if (EXPECTED_LOCATION && location !== EXPECTED_LOCATION) {
    fail(
      `Alias validation failed for ${TEST_URL}: expected Location ` +
        `${EXPECTED_LOCATION}, received ${location}.`,
    );
  }

  console.log(
    `Validated ${TEST_URL} -> ${location}; redirects will not be followed.`,
  );
}

export default function () {
  const response = http.get(TEST_URL, {
    redirects: 0,
    tags: { endpoint: "public_redirect", phase: "load" },
  });

  const is302 = response.status === 302;
  const is429 = response.status === 429;
  const is5xx = response.status >= 500 && response.status <= 599;
  const isNetworkError = response.status === 0;
  const location = response.headers.Location || "";
  const hasLocation = Boolean(location);
  const hasValidTarget =
    hasLocation &&
    !isUnavailableRedirect(location) &&
    (!EXPECTED_LOCATION || location === EXPECTED_LOCATION);
  const isValidRedirect = is302 && hasValidTarget;

  redirectSuccessRate.add(isValidRedirect);
  rateLimitedRate.add(is429);
  serverErrorRate.add(is5xx || isNetworkError);
  unexpectedStatusRate.add(!is302 && !is429);

  if (is302) {
    redirect302Count.add(1);
    redirectDuration.add(response.timings.duration);
    validLocationRate.add(hasLocation);
    validTargetRate.add(hasValidTarget);
  }
  if (is429) rateLimited429Count.add(1);
  if (is5xx) server5xxCount.add(1);

  check(response, {
    "response is HTTP 302": (res) => res.status === 302,
    "Location header exists": (res) => Boolean(res.headers.Location),
    "redirect target is available and expected": () => !is302 || hasValidTarget,
    "response is not 5xx": (res) => res.status < 500 || res.status > 599,
  });

  if (REQUEST_INTERVAL_SECONDS > 0) sleep(REQUEST_INTERVAL_SECONDS);
}

function validateConfiguration() {
  if (!/^https?:\/\//i.test(BASE_URL)) {
    fail(`BASE_URL must start with http:// or https://; received ${BASE_URL}`);
  }

  // This mirrors the public Nginx route: ^/([a-zA-Z0-9]{4,20})$.
  if (!/^[a-zA-Z0-9]{4,20}$/.test(TEST_ALIAS)) {
    fail(
      `TEST_ALIAS must be 4-20 ASCII letters or digits to match the public Nginx route; ` +
        `received ${TEST_ALIAS}`,
    );
  }
}

function isUnavailableRedirect(location) {
  return location
    .split(/[?#]/, 1)[0]
    .replace(/\/+$/, "")
    .endsWith("/link-unavailable");
}

function integerFromEnv(name, fallback, minimum) {
  const value = numberFromEnv(name, fallback, minimum);
  if (!Number.isInteger(value))
    throw new Error(`${name} must be an integer; received ${value}`);
  return value;
}

function numberFromEnv(name, fallback, minimum) {
  if (__ENV[name] === undefined || __ENV[name] === "") return fallback;

  const value = Number(__ENV[name]);
  if (!Number.isFinite(value) || value < minimum) {
    throw new Error(
      `${name} must be a number >= ${minimum}; received ${__ENV[name]}`,
    );
  }
  return value;
}
