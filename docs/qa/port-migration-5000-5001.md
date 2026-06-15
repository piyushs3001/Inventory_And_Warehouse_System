# QA — Port migration: web → 5000, API → 5001

**Date:** 2026-06-15 · **Flow/Task:** Move the dev stack off the 3000 range — Next.js web app to **:5000**, NestJS API to **:5001** — and keep the two surfaces wired (CORS + `NEXT_PUBLIC_API_URL`). Config/infra change; no business logic touched.

## What changed

| File | Change |
|---|---|
| `apps/api/.env` / `.env.example` | `PORT=3001 → 5001`; `CORS_ORIGIN=http://localhost:3000 → :5000` |
| `apps/api/src/main.ts` | Fallback defaults: port `3001 → 5001`, CORS origin `:3000 → :5000` |
| `apps/api/src/config/env.validation.ts` | Joi defaults: `PORT 5001`, `CORS_ORIGIN http://localhost:5000` |
| `apps/api/src/config/env.validation.spec.ts` | `PORT` default assertion `3001 → 5001` |
| `apps/api/src/app.setup.ts` | CORS doc comment `:3000`/`:3001 → :5000`/`:5001` |
| `apps/api/test/cors.e2e-spec.ts` | `WEB_ORIGIN → http://localhost:5000` (guards real CORS origin) |
| `apps/web/package.json` | `dev`/`start` scripts → `next … -p 5000` |
| `apps/web/.env` / `.env.example` | `NEXT_PUBLIC_API_URL → http://localhost:5001/api/v1` |
| `apps/web/src/lib/api/axios.ts` | `BASE_URL` fallback → `http://localhost:5001/api/v1` |
| `README.md`, `.claude/rules/api-contract-and-orval-client.md` | Swagger URL → `:5001`; dev-command port notes |
| Docs sweep — `docs/plans/*` (phase-0, swagger-orval, phase-1.5), `docs/superpowers/specs/*`, `docs/qa/{admin-url-prefix,login-password-toggle-and-cors,global-exception-filter}.md` | All web/API port mentions `3000/3001 → 5000/5001`; Postgres `5432` + MinIO `9000` left untouched |

> The Phase-2 worktree (`.claude/worktrees/phase-2-catalog-warehouses`) still holds the old ports in its own checkout — left untouched; it inherits these values when it next syncs with `piyush`.

**Adversarial diff audit:** every changed numeric is part of the `3000→5000 / 3001→5001` swap — no stray edits, no application logic touched, no secrets, and `DATABASE_URL` (`:5432` Postgres) / `S3_ENDPOINT` (`:9000` MinIO) untouched. The two port-asserting tests (`env.validation.spec.ts`, `cors.e2e-spec.ts`) were updated in lockstep, so the change is internally consistent.

## Automated verification

| Check | Result |
|---|---|
| `npm run typecheck` (api + web) | ✅ Passed |
| `npm run lint` (api + web) | ✅ Passed |
| `npm run test` — unit | ✅ Passed (api 53 / web 39) |
| `npm run build` (api + web) | ✅ Passed (web routes intact, env `.env` picked up) |
| `npm run test:e2e` | ✅ Passed (8 suites / 25 tests, incl. updated `cors.e2e`) |

## Live QA (servers running on the new ports)

Started `npm run dev:api` (→ :5001) and `npm run dev:web` (→ :5000); drove the login flow with Playwright MCP.

| # | Scenario | Type | Result |
|---|---|---|---|
| 1 | API binds to `:5001`; `GET /api/v1/health` → `{status:"ok"}` | Positive | ✅ Passed |
| 2 | Old API port `:3001` refuses connections | Negative | ✅ Passed (connection refused) |
| 3 | API login `POST /api/v1/auth/login` (admin) → 200 + tokens | Positive | ✅ Passed |
| 4 | Web binds to `:5000`; `/login` → HTTP 200; Next.js logs `Local: http://localhost:5000` | Positive | ✅ Passed |
| 5 | Old web port `:3000` refuses connections | Negative | ✅ Passed (connection refused) |
| 6 | Browser login at `:5000` → authenticated, lands on `/home` as Super Admin | Positive | ✅ Passed |
| 7 | Scoped admin reads render: `/admin/warehouses`, `/admin/users` show live data | Positive | ✅ Passed |
| 8 | All XHR calls target `http://localhost:5001/api/v1/*` (login, `/auth/me`, `/users`, `/warehouses`, `?includeArchived=true`) → all 200; **none** to `:3001`/`:3000` | Positive | ✅ Passed |
| 9 | CORS across `:5000 → :5001`: no CORS failures, **0 console errors** | Negative | ✅ Passed |

## Bugs found / fixed
- None. (A stray Playwright stale-ref click opened an "Archive this warehouse?" confirm during exploration; it was **cancelled** — both warehouses remained `ACTIVE`. No data changed.)

## Not covered / deferred
- Production `next start -p 5000` not exercised (dev server only); the `start` script mirrors `dev`'s `-p 5000`, and `next build` passed.
- Phase-2 worktree not re-pointed (separate branch checkout — see note above).
