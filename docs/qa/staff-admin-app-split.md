# QA — Staff/Admin App Split (split-apps Phases 3 + 4)

**Flow:** two separate apps on three ports + per-app logins + role-gate cross-bounce
**Date:** 2026-06-16 · **Plan:** `docs/plans/2026-06-16-split-staff-admin-apps.md` (Phases 3–4)
**Build:** branch `piyush`; **API :5002**, **Staff :5000**, **Admin :5001**; dev DB seeded (`admin@iws.local` SUPER_ADMIN; `staff@iws.local` STAFF created via API for the test).

Phase 3 = create `apps/admin`, move admin routes to its root (drop `/admin` prefix), per-app logins + role gate/bounce, admin nav. Phase 4 = API → :5002, CORS allows both app origins, client points at :5002. (Done together — the admin app on :5001 collides with the old API port, so the move was a prerequisite.)

## Verification (automated)
| Check | Result |
|---|---|
| typecheck (packages, api, staff, admin) | **Passed** |
| unit tests | **Passed** — staff **39**, admin **38**, packages **40** (api-client 9 / ui 24 / auth 7), api **63** |
| api e2e (incl. CORS) | **Passed — 33** (CORS reflects the web origin under the new default) |
| `next build` staff | **Passed** — routes: `/ /home /receive /dispatch /transfers /counting /inventory /login` (no `/admin/*`) |
| `next build` admin | **Passed** — routes at root: `/ /users /warehouses /products /inventory /purchase-orders /transfers /counting /reports /ai /login` |
| lint (api, staff, admin) | **Passed** |

## Browser QA (Playwright MCP — both apps, all paths)
| # | Scenario | Type | Result | Evidence |
|---|---|---|---|---|
| 1 | **Staff :5000** `/login` renders the full wireframe (Sign in **+ Create account** tabs, SSO) | Positive | **Passed** | snapshot |
| 2 | Staff login (`staff@iws.local`, STAFF) → `/home`; "Staff App" branding, staff-only nav | Positive | **Passed** | `screenshots/qa-split-staff-home.png` |
| 3 | **Bounce:** Super Admin signs into the Staff app → kicked to the Admin app (`:5001`) | Negative (authz) | **Passed** | URL → `localhost:5001/login` |
| 4 | **Admin :5001** `/login` is **sign-in only** (no Create-account tab/register), distinct "Admin Portal" branding, "Go to the Staff app" link | Positive | **Passed** | `screenshots/qa-split-admin-login.png` |
| 5 | Admin login (`admin@iws.local`, SUPER_ADMIN) → dashboard at `/`; admin nav at root | Positive | **Passed** | `screenshots/qa-split-admin-dashboard.png` |
| 6 | **Bounce:** Staff signs into the Admin app → kicked to the Staff app (`:5000`) | Negative (authz) | **Passed** | URL → `localhost:5000/` |

## Notes
- **Separate origins → separate sessions.** Tokens live in per-origin `localStorage`, so a bounce lands the user on the *other* app's login (no shared SSO session). Expected for two apps on different ports; a shared-session/SSO story is future work.
- Role gating is **UI convenience**; server-side role + scope authz is unchanged (all 33 e2e green).
- Bug fixed mid-phase: `NAV[surface]` became `Partial` (each app holds only its surface) → `sidebar` needed `?? []`; stale `.next` type cache referenced removed `/admin/*` routes → cleared.
- Cross-app bounce URLs come from `NEXT_PUBLIC_STAFF_URL` / `NEXT_PUBLIC_ADMIN_URL` (default `localhost:5000/5001`).

No open defects. Phases 3–4 clean both ways.

## Deferred
Phase 5 (root-script polish done; remaining `.claude/rules/*` + `design.md` path-reference touch-ups; this report) — and a shared-session/SSO story across the two origins.
