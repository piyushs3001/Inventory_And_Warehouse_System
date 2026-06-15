# QA — Swagger → Orval Contract Hardening

**Date:** 2026-06-15 · **Flow/Task:** Enrich the existing Swagger contract across `auth`/`users`/`warehouses`/`health` — typed `ErrorResponseDto`, per-endpoint error responses, operation summaries, path-param docs, DTO descriptions/examples — and surface the typed error model in the web login flow. Implemented subagent-driven in worktree `contract-hardening` (off `piyush`@`7c508e5`).
**Plan:** `docs/superpowers/plans/2026-06-15-swagger-contract-hardening.md` · **Spec:** `docs/superpowers/specs/2026-06-15-swagger-contract-hardening-design.md`

## What shipped (12 commits)
`ErrorResponseDto` adopted by the global exception filter (single source of truth) · composed decorators `ApiAuthErrors`/`ApiValidationError`/`ApiUnauthorizedTokenError` · health tag+`HealthDto` · operations/errors/params + DTO examples on all controllers · regenerated `openapi.json` + Orval client (added `ErrorResponseDto`/`HealthDto` models, consolidated enum models) · web login surfaces the typed API error message.

## Automated verification
| Check | Result |
|---|---|
| `npm run qa:gate` (typecheck → lint → unit → build → e2e) | ✅ Passed |
| API unit | ✅ 60 |
| Web unit | ✅ 41 |
| e2e | ✅ 28 (incl. new `error-envelope.e2e-spec.ts` asserting live 401/404/400 envelopes) |
| Contract drift (`contract-guardian`) | ✅ `openapi.json` + `generated/` in sync, zero drift |
| Invariant audit (`invariant-reviewer`) | ✅ No authz/scope/logic change; filter is a runtime no-op; **safe to merge** |

## Browser QA (Playwright MCP)
QA'd the worktree build in isolation (worktree API on `:5003`, web on `:5002`→`:5003`) to avoid the developer's running main stack on `:5000/:5001`.

| # | Scenario | Type | Result |
|---|---|---|---|
| 1 | Swagger UI (`/api/v1/docs`) renders all 4 tags (`health`,`users`,`auth`,`warehouses`) with operation summaries | Positive | ✅ Passed |
| 2 | Schemas panel lists `ErrorResponseDto` + `HealthDto` (and all DTOs) | Positive | ✅ Passed |
| 3 | `GET /warehouses/{id}` shows `id` path param + responses **200 / 401 ("Missing or invalid access token.") / 404 ("Not found, or outside the caller's scope (fail-closed).")**, each with an `ErrorResponseDto` example | Positive | ✅ Passed |
| 4 | Login with **wrong** password → page shows the API's message **"Invalid credentials"** (typed via `ErrorResponseDto`); call hits `:5003` and returns 401 | Negative | ✅ Passed *(after fix — see below)* |
| 5 | Login with **correct** credentials → redirects to `/admin` (happy path intact after the auth-context revert) | Positive | ✅ Passed |

## Bug found & fixed during QA
**Login error regression (introduced by the first Task-8 commit `57b4aa2`, fixed in `224ad79`).**
- **Symptom:** a genuine bad-password 401 displayed *"Unable to reach the server. Please try again."* instead of *"Invalid credentials"*.
- **Cause:** `auth-context.login()` had been changed to catch the AxiosError and re-throw `new Error(message)`, which **stripped `.response`**. The login page detects a 401 via `err.response?.status`, so it never saw the status; and the page never displayed the wrapped message anyway. The unit test passed because it asserted auth-context's thrown `.message` in isolation — a layer the UI doesn't read.
- **Fix:** reverted `auth-context.login()` to let the AxiosError propagate (`.response` intact) and moved the typed-error consumption into `login/page.tsx` — it now reads `err.response.data.message` (typed `ErrorType<ErrorResponseDto>`) on a 401 (fallback `'Invalid credentials'`), and still shows the network message when there's no response. Tests updated: auth-context test rewritten to assert the AxiosError propagates with `response.status === 401`; login-page tests added for the API-message-on-401 and network-failure cases.
- **Re-QA:** confirmed in the browser — bad creds → "Invalid credentials", good creds → `/admin`. Clean.

## Deferred follow-ups (pre-existing on `piyush`, NOT introduced here — out of scope for this annotation pass)
1. **`setWarehouses` / `assignStaff` → unhandled Prisma `P2025` → 500** when a referenced `warehouseId`/`userId` doesn't exist. The documented contract shows 400/404; the service should catch `P2025` and throw `NotFoundException` (mirror the `P2002`→409 pattern already in `users.service.create`). *(Service-logic fix — separate task.)*
2. **`WarehouseDto` omits `updatedAt`** (the service `select` doesn't return it; DTO + generated client are consistent). Add to `warehouseSelect` + DTO + regenerate if the field should be exposed.
3. **`auth/refresh` uses `@ApiBearerAuth('access-token')`** though it validates a refresh token. Register a second `refresh-token` security scheme and switch the decorator (documentation-only).

## Not covered
- Per-DTO example values are illustrative, not validated against runtime serialization (low risk; types are inferred by the Swagger CLI plugin).
