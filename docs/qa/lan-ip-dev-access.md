# QA — Dev access via localhost AND LAN IP

**Date:** 2026-06-15 · **Flow/Task:** Make the dev stack usable via **both** `http://localhost:5000` and the machine's LAN IP (`http://172.16.17.132:5000`) — fix the Next.js HMR websocket failure over the IP, and make API calls + CORS follow whichever host the page was opened from (incl. another device on the network). Dev-config change; no application logic touched.

## Symptom
Opening the app via the LAN IP produced repeated `WebSocket connection to 'ws://172.16.17.132:5000/_next/webpack-hmr…' failed`. Cause: recent Next.js blocks internal dev resources (HMR, etc.) from origins not in `allowedDevOrigins` — `localhost` is allowed by default, the LAN IP was not.

## What changed

| File | Change |
|---|---|
| `apps/web/next.config.ts` | `allowedDevOrigins` (env-driven via `DEV_ALLOWED_ORIGINS`, comma-sep) — permits HMR/dev resources from the LAN IP. Machine IP kept out of source. |
| `apps/web/src/lib/api/axios.ts` | API base URL now **host-following**: explicit `NEXT_PUBLIC_API_URL` wins → else (browser) `${location.protocol}//${location.hostname}:5001/api/v1` → else `localhost:5001`. So localhost→localhost:5001, IP→IP:5001. |
| `apps/web/.env` / `.env.example` | `NEXT_PUBLIC_API_URL` commented out so dev host-follows; `DEV_ALLOWED_ORIGINS` documented (local `.env` holds `172.16.17.132`). |
| `apps/api/.env` / `.env.example` | `CORS_ORIGIN` now a comma list incl. the LAN IP origin (`main.ts` already splits on comma). |

> Machine-specific IP lives only in the **gitignored** `.env` files (`DEV_ALLOWED_ORIGINS`, `CORS_ORIGIN`). Postgres `5432` / MinIO `9000` unchanged.

## Automated verification

| Check | Result |
|---|---|
| `npm run typecheck` (api + web) | ✅ Passed |
| `npm run lint` (api + web) | ✅ Passed |
| `npm run test` — web unit (incl. axios) | ✅ Passed (39) |
| `npm run build` (api + web) | ✅ Passed (`allowedDevOrigins` accepted) |

## Live QA (Playwright MCP — both origins, servers restarted to load new env)

Reachability (curl): API health + web `/login` → **200 on both** `localhost` and `172.16.17.132`.

| # | Scenario | Origin | Result |
|---|---|---|---|
| 1 | Login page renders; **no HMR websocket error** in console | IP `:5000` | ✅ Passed (0 errors / 0 warnings) |
| 2 | Login → `/admin/users`; API calls hit `http://172.16.17.132:5001/api/v1/*` (login, `/auth/me`, `/users`) → all 200 | IP `:5000` | ✅ Passed (host-following) |
| 3 | No CORS failure on cross-origin API calls from the IP page | IP `:5000` | ✅ Passed |
| 4 | Pre-login bootstrap `/auth/me` 401 → `/auth/refresh` 403 returns cleanly (CORS OK), shows login | localhost `:5000` | ✅ Passed (expected unauth flow) |
| 5 | Login → `/admin/users`; API calls hit `http://localhost:5001/api/v1/*` → all 200 | localhost `:5000` | ✅ Passed (host-following) |

## Bugs found / fixed
- None. The localhost `401`/`403` are the normal unauthenticated bootstrap on a fresh origin — and the fact they returned as HTTP responses (not CORS errors) confirms CORS is configured correctly.

## Not covered / deferred
- **IP is machine-specific (DHCP).** If it changes, update `DEV_ALLOWED_ORIGINS` and `CORS_ORIGIN` in the local `.env` files. Both are gitignored, so teammates set their own.
- Cross-device (e.g. phone) browser test was exercised via the IP URL from this machine; the API binds to all interfaces (`app.listen(port)`) so it is reachable on the LAN, and CORS + host-following cover the remote-device origin.
