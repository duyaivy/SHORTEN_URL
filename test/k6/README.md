# Public redirect load tests

This directory contains three complementary redirect scenarios:

| Script                      | Purpose                                                             |
| --------------------------- | ------------------------------------------------------------------- |
| `redirect-load.js`          | Repeated access to one known hot alias                              |
| `redirect-mixed-load.js`    | Configurable hot versus cold/long-tail alias distribution           |
| `redirect-negative-load.js` | Missing, inactive, and expired aliases plus negative-cache behavior |

`redirect-load.js` measures the public short-link path through Nginx and the
NestJS backend. It repeatedly requests one known alias, which models the normal
read-heavy, hot-cache workload. It does not create links or authenticate.

The measured production flow is:

```text
GET /{alias}
  -> Nginx GET /view/{alias}
  -> ShortUrlController.getShortUrl()
  -> GetShortUrlRedirectUseCase.execute()
  -> Redis cache (or MongoDB on a miss)
  -> Redis analytics INCR for an unprotected link
  -> HTTP 302
```

Every request uses `redirects: 0`. k6 records the ShortLink service's HTTP 302
without contacting or measuring the external destination site.

## Short built-in profiles

Set `TEST_PROFILE` to choose a complete load shape without passing every VU and
duration variable:

| Profile  | Redirect and mixed tests    | Negative test               | Intended use                           |
| -------- | --------------------------- | --------------------------- | -------------------------------------- |
| `smoke`  | 55 seconds, peak 10 VUs     | 45 seconds, peak 5 VUs      | Verify a deployment before load        |
| `load`   | 4m30s, peak/sustain 100 VUs | 3m15s, peak/sustain 50 VUs  | Default meaningful stability check     |
| `stress` | 4m30s, peak/sustain 300 VUs | 3m15s, peak/sustain 150 VUs | Find degradation in authorized staging |

The default is `load`. With the default one-second request interval, sustained
RPS is approximately bounded by the active VU count. Set
`REQUEST_INTERVAL_SECONDS=0` only for an authorized maximum-throughput test;
even a small VU count can then generate very high RPS.

## What the repository does on a redirect

- The public Nginx route accepts 4-20 alphanumeric characters at `/{alias}` and
  proxies it to the backend's `GET /view/:alias`. Nest excludes that backend
  route from the global `/api` prefix.
- Redis stores `url:{encodeURIComponent(alias)}` for one hour. A Redis miss (or
  unavailable Redis) falls back to Prisma/MongoDB and repopulates the cache.
- Missing, inactive, or expired links store a `__NULL__` sentinel for 60 seconds.
  This application then returns a 302 to `/link-unavailable`, rather than a 404.
  The k6 setup rejects that response so a bad alias cannot produce a misleading
  benchmark.
- An unprotected successful link awaits one Redis `INCR views:{alias}`. MongoDB
  view updates are not performed per redirect: every 30 seconds the scheduler
  drains the counters, batch-updates MongoDB, and invalidates affected URL cache
  entries. Consequently this test is mostly the hot-cache path, with brief real
  cache misses after those periodic invalidations. A password-protected link
  returns early to the password page and does not increment this counter, so use
  an unprotected alias when measuring the full normal redirect path.
- `ThrottlerGuard` is global, but the public `GET /view/:alias` handler explicitly
  skips both the `global` and `create` policies. Redirect capacity is therefore
  not capped by Nest's API limiter. Creation, authentication, password, and
  management endpoints remain rate-limited.
- If abuse protection is required in production, apply it at the CDN/WAF or
  Nginx edge. A reasonable initial ceiling is **100 requests/second per client
  IP (6,000/minute) with a burst of 200**, then tune it from real traffic. This
  edge limit is intentionally not implemented here because the repository does
  not contain the production Nginx configuration.
- Nginx forwards `X-Real-IP` and `X-Forwarded-For`, but the Nest bootstrap does
  not configure Express `trust proxy`. Verify the effective client-IP behavior
  in the deployment: requests can be grouped under a proxy/backend address,
  making 429s arrive much earlier than a per-user policy would suggest.
- The path has no authentication guard. Global request logging, cookie parsing,
  CORS setup, the exception filter, and the throttler guard still apply. The
  backend health endpoint is `GET /health`; production Nginx serves its own
  `200 OK` response at the same public path.

## Run the single-alias scenario

From the backend repository (`SHORTEN_URL`), first choose an existing, active,
unexpired, non-password alias. The setup phase makes one request, requires a 302
with a `Location` header, rejects the unavailable-page redirect, and aborts
before load begins if validation fails.

Run with a local k6 installation:

```bash
k6 run \
  -e BASE_URL=https://url.duyaivy.id.vn \
  -e TEST_ALIAS=abc123 \
  -e TEST_PROFILE=load \
  test/k6/redirect-load.js
```

Run a sub-minute deployment check with `-e TEST_PROFILE=smoke`. Use
`-e TEST_PROFILE=stress` only against an environment that is allowed to receive
approximately 300 concurrent VUs.

Optionally assert the exact destination as an additional safety check:

```bash
k6 run \
  -e BASE_URL=https://url.duyaivy.id.vn \
  -e TEST_ALIAS=abc123 \
  -e EXPECTED_LOCATION=https://example.com/destination \
  test/k6/redirect-load.js
```

Run with the official Docker image (the host network is only needed when
`BASE_URL` points to a service on the host):

```bash
docker run --rm -i \
  -e BASE_URL=https://url.duyaivy.id.vn \
  -e TEST_ALIAS=abc123 \
  -v "$PWD:/work" \
  -w /work \
  grafana/k6:latest run test/k6/redirect-load.js
```

For a local Docker service, use an address reachable from the k6 container, for
example `http://host.docker.internal:8080`. Note that a backend contacted
directly exposes `/view/{alias}`, while this test intentionally targets the
public Nginx contract `/{alias}`; point `BASE_URL` at the local Nginx service.

## Run the mixed hot/cold scenario

Provide comma-separated pools of existing, active, unexpired, unprotected
aliases. By default, 80% of requests use a random hot alias and 20% walk through
the cold/long-tail pool. k6 validates only one representative from each pool so
it does not warm the complete cold pool during setup.

```bash
k6 run \
  -e BASE_URL=https://url.duyaivy.id.vn \
  -e HOT_ALIASES=hot001,hot002,hot003 \
  -e COLD_ALIASES=cold001,cold002,cold003,cold004,cold005 \
  -e HOT_TRAFFIC_PERCENT=80 \
  -e TEST_PROFILE=load \
  test/k6/redirect-mixed-load.js
```

`COLD_ALIASES` means a low-frequency/long-tail pool. For a genuine cold-cache
test, use a large fresh pool whose entries have not been requested, or clear
only the test keys in an isolated staging Redis before the run. Do not flush a
shared or production Redis instance.

Important mixed-test variables:

| Variable                |  Default | Meaning                                     |
| ----------------------- | -------: | ------------------------------------------- |
| `HOT_ALIASES`           | required | Comma-separated hot alias pool              |
| `COLD_ALIASES`          | required | Comma-separated cold/long-tail alias pool   |
| `HOT_TRAFFIC_PERCENT`   |     `80` | Percentage of requests sent to the hot pool |
| `HOT_P95_THRESHOLD_MS`  |    `500` | Hot redirect p95 threshold                  |
| `COLD_P95_THRESHOLD_MS` |   `1000` | Cold/long-tail redirect p95 threshold       |
| `P99_THRESHOLD_MS`      |   `1500` | p99 threshold for both pools                |
| `MAX_RATE_LIMITED_RATE` |  `0.001` | Maximum accepted upstream 429 rate          |

The script exposes separate request counts, success rates, and latency trends
for hot and cold traffic. It does not attach the alias as a metric tag, avoiding
high-cardinality time series when the cold pool is large.

## Run the negative-alias scenario

Provide at least one comma-separated pool. Missing aliases do not require test
fixtures; inactive and expired aliases must already exist in that state. The
script intentionally makes no setup requests, preserving the first measured
negative-cache misses.

```bash
k6 run \
  -e BASE_URL=https://url.duyaivy.id.vn \
  -e MISSING_ALIASES=miss0001,miss0002,miss0003 \
  -e INACTIVE_ALIASES=off0001,off0002 \
  -e EXPIRED_ALIASES=old0001,old0002 \
  -e TEST_PROFILE=load \
  test/k6/redirect-negative-load.js
```

Every configured alias is expected to return HTTP 302 with a `Location` ending
in `/link-unavailable`. The test fails its thresholds if an alias unexpectedly
exposes a destination, returns the wrong status, produces excessive 5xx/network
errors, or is rate-limited. Use aliases that match the public Nginx contract:
4-20 ASCII letters or digits.

Important negative-test variables:

| Variable                | Default | Meaning                                     |
| ----------------------- | ------: | ------------------------------------------- |
| `MISSING_ALIASES`       |   empty | Comma-separated aliases that must not exist |
| `INACTIVE_ALIASES`      |   empty | Comma-separated inactive aliases            |
| `EXPIRED_ALIASES`       |   empty | Comma-separated expired aliases             |
| `P95_THRESHOLD_MS`      |   `750` | Unavailable-redirect p95 threshold          |
| `P99_THRESHOLD_MS`      |  `1500` | Unavailable-redirect p99 threshold          |
| `MAX_RATE_LIMITED_RATE` | `0.001` | Maximum accepted upstream 429 rate          |

All three scripts share `TEST_PROFILE`, `REQUEST_INTERVAL_SECONDS`, and the
stage override variables such as `WARMUP_VUS`, `LOW_VUS`, `HIGH_VUS`,
`SUSTAIN_VUS`, and their duration counterparts. An explicitly supplied stage
variable overrides that value from the selected profile. The redirect and mixed
scripts additionally have a moderate stage.

## Configuration and default single-alias load profile

| Variable                             |                     Default | Meaning                                                   |
| ------------------------------------ | --------------------------: | --------------------------------------------------------- |
| `BASE_URL`                           | `https://url.duyaivy.id.vn` | Public Nginx origin, without the alias                    |
| `TEST_ALIAS`                         |                    `abc123` | Existing 4-20 character alphanumeric alias                |
| `EXPECTED_LOCATION`                  |                       empty | Optional exact expected `Location` value                  |
| `TEST_PROFILE`                       |                      `load` | `smoke`, `load`, or `stress`                              |
| `REQUEST_INTERVAL_SECONDS`           |                         `1` | Pause per VU after each request; `0` removes pacing       |
| `WARMUP_VUS` / `WARMUP_DURATION`     |               profile-based | Optional warm-up override                                 |
| `LOW_VUS` / `LOW_DURATION`           |               profile-based | Optional low-stage override                               |
| `MODERATE_VUS` / `MODERATE_DURATION` |               profile-based | Optional moderate-stage override                          |
| `HIGH_VUS` / `HIGH_DURATION`         |               profile-based | Optional high-stage override                              |
| `SUSTAIN_VUS` / `SUSTAIN_DURATION`   |               profile-based | Optional sustained-stage override                         |
| `RAMP_DOWN_DURATION`                 |               profile-based | Optional graceful ramp-down override                      |
| `P95_THRESHOLD_MS`                   |                       `500` | Initial p95 latency baseline                              |
| `P99_THRESHOLD_MS`                   |                      `1000` | Initial p99 latency baseline                              |
| `MAX_SERVER_ERROR_RATE`              |                      `0.01` | Maximum baseline rate for network/5xx/unexpected failures |
| `MAX_RATE_LIMITED_RATE`              |                     `0.001` | Maximum accepted upstream 429 rate                        |

The default `load` single-alias run lasts 4m30s. Start with the 55-second smoke
profile after a deployment:

```bash
k6 run \
  -e BASE_URL=https://url.duyaivy.id.vn \
  -e TEST_ALIAS=abc123 \
  -e TEST_PROFILE=smoke \
  test/k6/redirect-load.js
```

For a short, stronger staging run, switch only the profile:

```bash
k6 run \
  -e BASE_URL=https://staging-url.example.com \
  -e TEST_ALIAS=abc123 \
  -e TEST_PROFILE=stress \
  test/k6/redirect-load.js
```

Do not run high or unpaced stress tests against production without confirming
capacity, monitoring, authorization, and an abort plan. The defaults are a
starting profile, not a production SLO or a claim about safe capacity.

## Metrics and thresholds

Standard k6 output includes request rate (`http_reqs` rate), VUs, checks,
`http_req_failed`, and request-duration percentiles. Custom metrics make the
response classes explicit:

| Metric                         | Interpretation                                                       |
| ------------------------------ | -------------------------------------------------------------------- |
| `redirect_success_rate`        | Fraction of all load requests that were 302 with a `Location` header |
| `redirect_302_count`           | Successful 302 response count                                        |
| `redirect_duration`            | Latency trend for 302 responses only                                 |
| `redirect_valid_location_rate` | Fraction of 302s that contained `Location`                           |
| `redirect_valid_target_rate`   | Fraction of 302s targeting an available/expected location            |
| `rate_limited_rate`            | Fraction of requests rejected upstream with HTTP 429                 |
| `rate_limited_429_count`       | Upstream/edge rate-limit responses                                   |
| `server_5xx_count`             | Backend/proxy 5xx responses                                          |
| `server_error_rate`            | 5xx plus network failures as a fraction of requests                  |
| `unexpected_status_rate`       | Anything other than 302 or 429                                       |

The checks explicitly report “response is HTTP 302”, “Location header exists”,
and “response is not 5xx”. A 429 therefore lowers the first two check rates on
purpose; it is not hidden. At the HTTP protocol level, 302 and 429 are declared
expected statuses, so `http_req_failed` focuses on network failures and other
unexpected statuses. Use `rate_limited_429_count` to explain the difference.

Initial thresholds require p95 below 500 ms, p99 below 1,000 ms, valid
`Location` headers and targets on more than 99% of returned 302s, and less than
1% server, network, or unexpected-status errors. They are adjustable baselines
because the repository defines no formal latency SLO. `http_req_duration`
covers every load response, including 429s; `redirect_duration` isolates actual
302 latency.

## Reading the result

- **RPS:** use the rate shown beside `http_reqs`. Compare it with
  `redirect_302_count / test duration`; total RPS can keep rising while useful
  redirect throughput is capped by 429s.
- **p90/p95/p99:** 90%, 95%, and 99% of observations completed at or below these
  values. A widening p99 while p50 stays flat usually signals queuing, periodic
  cache/analytics effects, or a small slow tail.
- **Rate limiting vs failure:** the Nest redirect endpoint is not throttled, so
  rising `rate_limited_429_count` usually indicates a CDN, WAF, Nginx, or an old
  deployment is limiting traffic. Rising `server_5xx_count`, network errors, or
  `unexpected_status_rate` indicates instability or incorrect routing instead.
- **Approximate saturation:** compare successive VU stages. Saturation is near
  the first level where attempted RPS no longer produces proportional 302 RPS,
  p95/p99 rise persistently, or 5xx/network errors begin. Require stability
  during the sustained stage, not just a brief peak.

The terminal end summary aggregates the whole run. For exact per-stage
comparisons, send k6's time-series output to your normal Grafana/Prometheus
stack (or another k6 output), correlate metrics with `vus`, and inspect each
stage's interval. Repeated runs with one fixed VU level are another simple way
to confirm the transition point.

The public redirect handler skips the two Nest throttler policies, so these
scripts can measure backend capacity. Any edge rate limit still applies. Run
stress tests only in an explicitly authorized environment with monitoring and
an abort plan; the scripts do not spoof client IPs or bypass infrastructure
controls.
