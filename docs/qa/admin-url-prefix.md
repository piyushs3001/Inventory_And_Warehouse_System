# QA — Admin Portal `/admin` URL Prefix

**Date:** 2026-06-13 · **Flow/Task:** Adopt a real `/admin` URL prefix for the Admin Portal (decision before Phase 2). Docs updated first, then implemented. Frontend-only.

## What changed
- **Admin Portal → `/admin` prefix:** `app/(admin)/` route group restructured to a real `app/admin/` segment (via `git mv`, history preserved). The users screen is now `/admin/users`; Phase 2 admin screens will be `/admin/warehouses`, `/admin/products`, `/admin/categories`.
- **`/admin` index** (`app/admin/page.tsx`) → redirects to `/admin/users` (admin entry point; becomes a dashboard in Phase 6).
- **Root redirect** (`app/page.tsx`): Super Admin → `/admin` (was `/users`); everyone else → `/home`.
- **Nav** (`nav.tsx`): the `Users` link now points to `/admin/users`.
- **Staff App unchanged** — still at the root (`(staff)` route group → `/home`).
- **Role gating unchanged** — `app/admin/layout.tsx` still gates `/admin/*` to Super Admin, server-side authz unchanged.
- **Backend API paths unchanged** (`/api/v1/users`, …) — only frontend page URLs moved. (The `/users` strings in the moved component tests are API mocks, intentionally left as-is.)
- **Docs** updated to make `/admin` the documented convention: `CLAUDE.md`, `PRD.md` (§11.2 + §12 note), `docs/phases/README.md`, `phase-1.5` + `phase-2` plans, and a note atop the phase-1.5 implementation plan.

## QA method
Verified via **unit tests** (routing behavior), the **production build** (route-table integrity), and a **live smoke test** against the running dev server. Full **browser (Playwright MCP) QA is folded into the pending Phase 1.5 auth + user-management QA**, which now targets the `/admin` URLs (Playwright MCP was approved but isn't loaded in this session yet — runs after a session restart).

## Scenarios & results

| # | Scenario | Check | Result |
|---|---|---|---|
| 1 | ▲ `Users` nav link points to `/admin/users` | unit (`nav.test.tsx`) | **Passed** |
| 2 | ▲ Root `/` redirects a Super Admin to `/admin` | unit (`page.test.tsx`) | **Passed** |
| 3 | ▲ Root `/` redirects a non-admin to `/home` | unit (`page.test.tsx`) | **Passed** |
| 4 | ▼ Root `/` sends an unauthenticated visitor to `/login` | unit (`page.test.tsx`) | **Passed** |
| 5 | ▲ Production build emits routes `/`, `/admin`, `/admin/users`, `/home`, `/login` | `next build` | **Passed** |
| 6 | ▲ Live: `GET /admin/users` reachable | curl `:5000` | **Passed** (200) |
| 7 | ▲ Live: `GET /admin` reachable (→ `/admin/users`) | curl `:5000` | **Passed** (200) |
| 8 | ▲ Live: `GET /home`, `/login` reachable | curl `:5000` | **Passed** (200) |
| 9 | ▼ Live: old `GET /users` no longer a route | curl `:5000` | **Passed** (404) |
| 10 | ▲ Admin role gating + moved component tests intact | vitest full suite | **Passed** (30/30) |

## Build gate (web)
typecheck ✓ · lint ✓ · unit **30/30** ✓ · build ✓ · live smoke ✓

## Bugs found / fixed
- After the folder move, `tsc --noEmit` failed on **stale Next.js generated route types** in `.next/` (still referencing `(admin)` + pre-move typed-routes). Not a source bug — resolved by a fresh `next build` regenerating `.next/types`; typecheck then clean.

## Deferred
- **Browser QA of the navigable flow** (log in as Super Admin → land on `/admin` → use `/admin/users`; Staff user blocked from `/admin/*`) is folded into the pending **Phase 1.5 auth/user-management QA** (`docs/qa/auth-user-management.md`), which now asserts the `/admin` URLs. Requires the Playwright MCP server loaded (approved; needs a session restart).
