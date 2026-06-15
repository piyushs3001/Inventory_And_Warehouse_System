# QA — Global Exception Filter

**Date:** 2026-06-13 · **Flow/Task:** Phase 0 remediation — the documented "exception filter" deliverable (`docs/phases/phase-0-foundation.md` §Deliverables) was never built. Backend-only.

## What was built
`apps/api/src/common/filters/all-exceptions.filter.ts` — `AllExceptionsFilter` (`@Catch()`), registered globally via an `APP_FILTER` provider in `AppModule` (DI-based → active in production bootstrap *and* e2e):
- **HttpException** → preserves its status, `message` (string or validation array) and `error` label.
- **Any unknown / non-HTTP exception** → generic **500** `{ message: 'Internal server error' }`; the real cause is logged server-side (`Logger.error` with stack) so it is not swallowed, but never returned to the client (CLAUDE.md: "never leak internals").
- Consistent envelope: `{ statusCode, error, message, timestamp, path }`. The web only branches on `error.response.status`, so the body shape is additive and non-breaking.

## QA method
**Browser (Playwright MCP) QA: Not Applicable for this change.** The filter changes error-response *envelopes*, not any user-facing flow/screen, and Playwright MCP is not connected this session. Verification is automated **unit** tests (filter logic, positive + negative/no-leak) + **e2e** that hit the running app and assert the filter is globally active. The error envelope will also be exercised incidentally by every future endpoint's negative-path QA.

## Scenarios & results

| # | Scenario (▲ positive / ▼ negative) | Layer | Result |
|---|---|---|---|
| 1 | ▲ `HttpException` (Forbidden) → 403, preserves `message`/`error`, adds `timestamp`/`path` | unit | **Passed** |
| 2 | ▲ `BadRequestException` with array message → 400, preserves the validation array | unit | **Passed** |
| 3 | ▼ Unknown `Error` → 500 generic `message`, real cause logged server-side, **secret not leaked** in body | unit | **Passed** |
| 4 | ▲ Unmatched route `GET /api/v1/does-not-exist` → normalized 404 (proves `APP_FILTER` globally registered) | e2e | **Passed** |
| 5 | ▼ Invalid login body → 400 with the same envelope + array `message` | e2e | **Passed** |
| 6 | ▲ Existing flows unaffected: 200/201 success, 401 unauth, 403 wrong-role, 204 logout | e2e | **Passed** (full auth/users e2e green) |

## Live server re-verification (running instance — 2026-06-13)

Re-verified independently against the **actual running API** (`npm run dev:api`, port 5001), not just the supertest app — confirms the `APP_FILTER` is active in the real bootstrap path:

| # | Scenario (▼ negative) | Request | Observed | Result |
|---|---|---|---|---|
| 7 | ▼ Unknown route → normalized 404 | `GET /api/v1/does-not-exist` | `{statusCode:404,error:"Not Found",message:"Cannot GET …",timestamp,path}` | **Passed** |
| 8 | ▼ Invalid login body → normalized 400 (validation array) | `POST /api/v1/auth/login {email:"not-an-email"}` | `{statusCode:400,error:"Bad Request",message:["email must be an email", …],timestamp,path}` | **Passed** |
| 9 | ▼ Wrong password → normalized 401, no internals leaked | `POST /api/v1/auth/login {…,password:"wrong"}` | `{statusCode:401,error:"Unauthorized",message:"Invalid credentials",timestamp,path}` | **Passed** |

All three returned the consistent `{statusCode, error, message, timestamp, path}` envelope with no stack traces or internals in the body.

## Build gate
typecheck ✓ · lint ✓ · unit **35/35** (3 new) ✓ · build ✓ · e2e **15/15** (2 new) ✓ · live-server smoke ✓

## Bugs found / fixed
- Lint: initial tests used `expect.any(String)` as an object-literal value and `mock.calls[0][0]` (both `any` → `@typescript-eslint/no-unsafe-assignment`/`no-unsafe-member-access`). **Fixed** by capturing the response body via a typed mock and asserting fields directly. Re-ran clean.

## Not covered / deferred
- A dedicated 500-producing endpoint isn't added (no throwaway routes); the unknown-error → 500 path is covered at the unit layer. Real 5xx normalization will be exercised by services as the domain grows.
- `error` label for a raw-string `HttpException` stays the default — cosmetic, uncommon path; the web doesn't read the error body.
