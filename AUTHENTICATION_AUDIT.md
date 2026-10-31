# Cookie authentication and short URL ownership audit

The ownership bug is fixed in the working trees of both repositories. No deployment was performed.

## Root cause and reproduction

Before this change, `src/modules/short-url/presentation/guards/optional-jwt.guard.ts:15–26` accepted missing, expired, and invalid access tokens without setting `req.userId`. The browser removes the access cookie at its Max-Age, so checking only an expired JWT would not have fixed the bug.

The frontend derived login status from localStorage token presence (`../SHORTEN_URL_FRONTEND/src/contexts/app.context.tsx:15` before changes), and login saved returned access/refresh tokens (`src/apis/auth.api.ts:30–33` in the frontend before changes). Token presence stayed truthy after expiry. There was no startup `/auth/me` verification.

Reproduction: log in → let the access cookie expire → submit the shortening form → `url.service.ts:13–14` posts to `/api/` → optional guard accepts the request anonymously → `create-short-url.usecase.ts:59–67` persists `owner_id: null` → HTTP 201 bypasses the client's 401 refresh path → owner-filtered management excludes the URL. This was not a delayed-write bug: the controller, use case, and Prisma repository already awaited persistence.

## Architecture found

| Area | Actual implementation |
| --- | --- |
| Frontend | Vite, React, React Query, React context, Axios. No Next.js, SSR, server components, or BFF cookie forwarding. |
| Backend | NestJS, Express adapter, cookie-parser, jsonwebtoken, Prisma and MongoDB. |
| Issuance | Email and Google login use cases sign access/refresh JWTs; auth controller sets cookies. |
| Cookies | `access_token`, `refresh_token`; HttpOnly, Secure, SameSite=Strict, host-only (no Domain), Path=/ (previously Express default on email login/refresh; explicit everywhere now). Max-Age follows configured JWT lifetime; defaults 1h and 3d. |
| Validation | `JWTTokenService.decodeToken` calls `jwt.verify`, despite its misleading name. Expiration is checked. Guards now also require access-token type and nonempty string identity; accepted algorithm is HS256, matching issuance. |
| Refresh | POST `/api/auth/refresh-token`; refresh-token type, signature, expiry and SHA-256 hash record checked. Previously delete/create rotation, potentially identical same-second JWTs; now unique JWT ID and atomic conditional hash replacement. |
| Logout | DELETE `/api/auth/logout` revokes refresh hash and clears cookies. Password reset revokes all refresh records for the user. Existing access JWTs remain valid until their expiration. |
| Browser HTTP | Axios includes credentials; retries use browser-renewed cookies, never Authorization injection or JavaScript cookie access. |
| Server HTTP | Google OAuth/reCAPTCHA HTTP clients are outbound provider integrations, not frontend session proxies. No server-side application-session forwarding path was found. |
| Proxy | Both frontend nginx configs proxy `/api/` to the backend cluster; Cookie and Set-Cookie use normal proxy forwarding. Config files listen on HTTP; external TLS termination must be supplied for production. |
| CORS/CSRF | Previously CLIENT_URL with a `true` fallback and no mutation-origin check. Now explicit normalized CLIENT_URL origin, credentialed CORS, and foreign/missing-origin rejection for cookie mutations. |

`POST /api/` is the only short-URL creation endpoint. `POST /api/view/:alias` retrieves password-protected links; QR history creation is separate. The creation DTO does not accept client identity. Ownership comes exclusively from a verified access token through OptionalUserId, and Prisma stores it as `owner_id`. Guests retain their existing 14-day expiry; owned links retain no expiry.

## Changed files and behavior

Backend:

- `src/modules/short-url/presentation/guards/optional-jwt.guard.ts`: guests require no session cookies and no `X-Auth-Intent: required`. Any credential presence, including empty cookies, requires verified access authentication.
- `src/modules/auth/presentation/guards/jwt-auth.guard.ts`: verifies once, checks access type/identity, removes cookie logging, returns 401 with `data.code: SESSION_REQUIRED` before business logic.
- `src/modules/short-url/presentation/controllers/short-url.controller.ts`: documents additive intent header and pre-write 401 in existing Swagger contract.
- `src/modules/auth/application/use-cases/refresh-token.usecase.ts`: invalid JWTs produce 401; infrastructure errors remain errors; rotation uses atomic repository operation.
- `src/modules/auth/domain/repositories/refresh-token.repository.ts`, `infrastructure/prisma-refresh-token.repository.ts`: conditional old-hash/user/unexpired update; exactly one rotation wins, failed writes retain the old hash.
- `src/modules/auth/infrastructure/jwt-token.services.ts`: unique refresh JWT IDs and explicit HS256 verification.
- `src/modules/auth/presentation/controllers/auth.controller.ts`: explicit cookie paths; credentials no longer exposed in response JSON. Login returns `{ user }`, refresh returns null inside the existing response envelope. Routes and existing HTTP status behavior remain unchanged.
- `src/shared/config/http-security.ts`, `src/main.ts`: explicit CORS origin and mutation-origin checks. Originless nonbrowser guest calls remain possible; cookie-authenticated scripts must send the configured Origin.
- `src/app.module.ts`, `src/modules/auth/infrastructure/google-oauth.client.ts`: strip query strings from request logs and avoid raw OAuth error payload logging.
- `package.json`, guard spec, integration test: reproducible verification commands and coverage.

Frontend:

- `src/services/axios-client.ts`: one shared refresh promise; every waiter resolves/rejects; only SESSION_REQUIRED is retried, once. A generation counter handles delayed pre-refresh 401s. Creation intent stays required on retries even if initial UI state was stale. No retries on network errors, 5xx, unrelated 401, or 403; no automatic guest fallback. Refresh 401 expires local state; network/5xx does not. Requests have a 15-second timeout.
- `src/services/session-state.ts`, `src/services/session.ts`, `src/contexts/app.context.tsx`: verified `/auth/me` startup restoration, shared during StrictMode mount; expired access refreshes normally. Unknown/outage state cannot send anonymous creation. Confirmed expiry clears profile/query cache. Startup outages offer Retry.
- `src/apis/auth.api.ts`, `src/utils/storage.ts`: remove token persistence; migrate legacy stored tokens away on startup. Noncredential profile storage is a restoration hint, not authorization. Registration explicitly logs in before fetching the profile because register itself issues no cookies. Login clears account query cache.
- `src/pages/ShortenURL/ShortenURL.tsx`: expired-session login dialog stays on the form; no forced redirect or form reset. Temporary failures show a retry message and preserve input.
- `package.json`, `pnpm-lock.yaml`, `vitest.config.ts`, `test/session.test.ts`: frontend regression runner and tests; no new authentication library.

Before: expired login → successful anonymous write. After: expired login → pre-write 401 → one cookie refresh → one retry → owned write, or an error with no creation.

## Verification performed

| Command (in the indicated repository) | Result |
| --- | --- |
| Backend `pnpm run build`; final `./node_modules/.bin/nest build` | Passed |
| Backend `./node_modules/.bin/tsc --noEmit` | Passed |
| Backend `./node_modules/.bin/oxlint src/ test/` | Passed, existing warnings |
| Backend `./node_modules/.bin/vitest run` | 12 passed |
| Backend `AUTH_TEST_DATABASE_URL=... node --test test/auth-ownership.integration.cjs` | 20 passed against isolated real MongoDB 7 replica set |
| Frontend `pnpm install` | Passed; added Vitest and lock entries |
| Frontend `pnpm run build`; final `tsc -b` and `vite build` using local binaries | Passed; existing lottie-web eval warning |
| Frontend `./node_modules/.bin/vitest run` | 14 passed |
| Frontend `./node_modules/.bin/eslint .` | Passed with warnings; edited-file formatting subsequently fixed |
| Backend `vitest run --config ./vitest.config.e2e.ts` | Existing generic smoke suite failed before tests: runtime `express` import cannot resolve under Vitest. It also targets the obsolete Hello World route. Not claimed passing. |
| Both repositories `git diff --check` | Passed |

Initial offline dependency installation lacked package metadata; online installation succeeded. Initial sandboxed pnpm version verification and local MongoDB connections failed; authorized runs succeeded. The first backend unit command found no tests before the new spec was added. No production database was used. The isolated MongoDB container was stopped after verification.

Coverage: guest/missing-cookie creation; verified ownership and cross-user list isolation; expired, malformed, empty, wrong-type and missing-required access; valid/invalid/expired/revoked refresh; simultaneous refresh and atomic rotation; refresh 401/network/500; late 401; one-retry limit; reload restoration; no accidental guest fallback; no duplicate writes during auth retry; persistence failures; rotation-write failure; cookie flags; logout revocation; CSRF origin checks; rejection of client identity.

Frontend tests exercise real Axios interceptors with controlled adapters, not a browser cookie jar. Integration tests exercise compiled Nest controllers, actual JWT validation, real refresh/URL repositories, HTTP responses, and MongoDB state. Login credential checking and profile lookup are fixture providers in this focused integration harness; Google, email, and reCAPTCHA are not called. Browser rendering and deployed HTTPS/CORS behavior still need a release smoke test.

To repeat database tests (fresh isolated container):

```sh
docker run -d --name shortlink-auth-test-mongo -p 127.0.0.1:27028:27017 mongo:7 --replSet rs0 --bind_ip_all
docker run --rm --network container:shortlink-auth-test-mongo mongo:7 mongosh --quiet --eval 'rs.initiate({_id:"rs0",members:[{_id:0,host:"localhost:27017"}]})'
# From SHORTEN_URL, after the replica set elects its primary:
DATABASE_URL='mongodb://127.0.0.1:27028/shortlink_auth_test?directConnection=true&replicaSet=rs0' pnpm exec prisma db push --skip-generate
AUTH_TEST_DATABASE_URL='mongodb://127.0.0.1:27028/shortlink_auth_test?directConnection=true&replicaSet=rs0' pnpm run test:auth
```

The harness rejects database names outside `shortlink_auth_test*`, clears test records, and must never be pointed at shared data.

## Deployment and remaining concerns

- Deploy frontend/backend together: response-token fields are intentionally removed and SESSION_REQUIRED plus X-Auth-Intent is an additive protocol. Existing cookie lifetimes and Secure/HttpOnly/SameSite settings are preserved. No schema migration is needed.
- Set CLIENT_URL to the frontend URL; origin is normalized so `/a` is not part of CORS matching. Missing configuration now stops startup. Allow the X-Auth-Intent header through any external gateway and preserve Origin, Cookie, Set-Cookie. Do not cache authenticated API responses.
- Use HTTPS externally. Local HTTP LAN addresses in compose examples do not support Secure session cookies; do not disable Secure to compensate. Same-site HTTPS subdomains can use Strict cookies despite being cross-origin; unrelated sites cannot. The current architecture is intended for same-site deployment.
- Refresh sharing is per JavaScript context, not a browser-wide lock. Atomic rotation prevents duplicate winners across tabs/backend nodes. A racing tab can receive 401 and need to restore/login; it cannot create an anonymous link.
- A replayed/unknown refresh hash is rejected, but no longer revokes all of the user's other sessions: that old behavior incorrectly revoked winning sessions during ordinary races. Family-based replay detection would require additional session history/schema and remains a separate enhancement.
- Stateless access JWTs are not immediately revoked by logout/password reset. Existing Google OAuth flow lacks application-level state validation and uses GET for exchange; review this separately. Mutation-origin protection does not retrofit OAuth state validation.
- Automatic retry is limited to a known pre-write guard failure. Ambiguous network failures after creation are not retried; this change does not introduce general idempotency for manual resubmission.
- Historical anonymous URLs cannot safely be reassigned without independent ownership evidence.
- Verify in a real browser over deployed HTTPS: login → access-cookie expiry/removal → create → management listing; then revoke refresh → create → login dialog and preserved form; then block refresh networking → recoverable error without creation.
