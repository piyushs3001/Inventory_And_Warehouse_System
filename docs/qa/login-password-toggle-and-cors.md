# QA — Login: password show/hide toggle + CORS fix

**Date:** 2026-06-13 · **Flow/Task:** Login (Staff/Admin shared `/login`). Two changes:
1. **Feature** — show/hide password "eye" toggle.
2. **Bug fix** — the browser could not reach the API at all (no CORS), and the login page mislabeled that network failure as "Invalid credentials".

## Root cause of the reported "Invalid credentials"
The web app (`http://localhost:3000`) and the API (`http://localhost:3001`) are **different origins**. `apps/api/src/main.ts` never called `app.enableCors()`, so the browser blocked every request (preflight `OPTIONS /api/v1/auth/login` returned **404**, no `Access-Control-*` headers). `curl` worked because CORS is browser-enforced only. The login page's `catch {}` turned *any* error — including this network/CORS failure — into the message **"Invalid credentials"**, so a correct password still showed that text.

## What changed
- **`apps/api/src/app.setup.ts` (new)** — `configureApp(app, { corsOrigin })`: single source of truth for global prefix + `ValidationPipe` + `enableCors`, shared by `main.ts` and e2e so they can't drift.
- **`apps/api/src/main.ts`** — calls `configureApp` with `CORS_ORIGIN` (comma-separated list supported) read via `ConfigService`; also reads `PORT` from config.
- **`apps/api/src/config/env.validation.ts` + `.env(.example)`** — new validated `CORS_ORIGIN` (default `http://localhost:3000`).
- **`apps/web/src/app/login/page.tsx`** — (a) password input `type` toggles via an Eye/EyeOff button (`aria-label` "Show password"/"Hide password", `aria-pressed`, `type="button"` so it never submits); (b) error handling now distinguishes a real **401** ("Invalid credentials") from a network/5xx failure ("Unable to reach the server. Please try again.").

## QA method
- **Automated:** Vitest (web) + Jest unit/e2e (api).
- **Real browser (Chrome via DevTools Protocol):** Playwright MCP is **not connected** this session, so the live flow was driven through a headless-Chrome CDP script (type, click toggle, submit, read `type`/`location`/`localStorage`), positive + negative. Screenshots captured.

## Scenarios & results

| # | Scenario (▲ positive / ▼ negative) | Layer | Result |
|---|---|---|---|
| 1 | ▲ Password masked by default; "Show password" toggle present | unit + browser | **Passed** |
| 2 | ▲ Click toggle → input `type=text`, icon/label → "Hide password" | unit + browser | **Passed** |
| 3 | ▲ Click again → re-masked (`type=password`) | unit + browser | **Passed** |
| 4 | ▼ Toggle is `type="button"` → does **not** submit the form | unit + browser | **Passed** |
| 5 | ▲ Valid login `admin@iws.local` / `Admin@12345` → navigates off `/login` to `/users` (Super Admin) | browser | **Passed** |
| 6 | ▼ Wrong password → real **401**, shows "Invalid credentials", stays on `/login` | browser + unit | **Passed** |
| 7 | ▼ Network/CORS failure (no `response.status`) → shows "Unable to reach the server", **not** "Invalid credentials" | unit | **Passed** |
| 8 | ▲ CORS preflight `OPTIONS /api/v1/auth/login` (Origin :3000) → 2xx + `Access-Control-Allow-Origin: http://localhost:3000` | e2e + live curl | **Passed** |
| 9 | ▲ Actual cross-origin POST reflects `Access-Control-Allow-Origin` | e2e | **Passed** |

## Build gate
api: typecheck ✓ · unit **35/35** ✓ · e2e **17/17** (cors suite +2) ✓ · web: typecheck ✓ · lint ✓ · unit **27/27** (+2 error-handling, +3 toggle) ✓ · live preflight ✓ · browser QA **5/5** ✓

## Bugs found / fixed
- **API had no CORS** → browser blocked all calls; surfaced as "Invalid credentials". **Fixed** (`enableCors` via `configureApp`, env-driven origin) + regression e2e.
- **Login page mislabeled non-401 failures** as "Invalid credentials". **Fixed** (status-aware message) + unit tests.

## Not covered / deferred
- **e2e isolation (action needed):** the api e2e suite runs against the **dev `iws` database** (`DATABASE_URL`) and **truncates `users`**, which deleted the seeded admin mid-session and briefly made login 401 until re-seeded (`npm run db:seed -w api`). e2e should target a separate test DB (or restore the seed in teardown). Not fixed here — flagged for a follow-up.
- `credentials: true` is set on CORS for future cookie/refresh flows; the JWT currently rides the Authorization header.
- Playwright MCP browser QA not used (server not connected); equivalent coverage achieved via the CDP driver above.
