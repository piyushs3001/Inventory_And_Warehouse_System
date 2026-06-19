# QA — Login role-validation (no cross-app bounce) + Admin login redesign

**Flow:** both apps' login pages
**Date:** 2026-06-19 · **Build:** Staff :5000, Admin :5001, API :5002; dev DB seeded (`admin@iws.local` SUPER_ADMIN; `staff@iws.local` STAFF)

## What changed
1. **Wrong-role login now validates in place** instead of silently bouncing to the other app. Previously a valid Admin account entered on the Staff login authenticated, then the route guard bounced the browser to `localhost:5001/login` (confusing). Now each login checks the authenticated account's role (from the access-token claim, `@iws/api-client` `getAccessRole`) and, if it's not for this app, **clears the session and shows an inline message + a link to the correct app** — no redirect. The guard's cross-app bounce was removed (`useRequireAuth` → this app's `/login` on wrong role).
2. **Admin login redesigned** to a distinct **centered card on a deep-blue "console" backdrop**, clearly different from the Staff app's split-screen marketing layout.

## Verification (automated)
| Check | Result |
|---|---|
| typecheck (api-client, auth, staff, admin) | **Passed** |
| unit tests | **Passed** — api-client **11** (+jwt), auth **6**, staff **40** (+wrong-role), admin **39** (+wrong-role) |
| lint (staff, admin) | **Passed** |
| `next build` staff + admin | **Passed** |

## Browser QA (Playwright MCP)
| # | Scenario | Type | Result | Evidence |
|---|---|---|---|---|
| 1 | **Staff :5000** — enter a valid **admin** account → stays on `/login`, shows "This account doesn't have access to the Staff app." + "Open the Admin Portal →" link; **no bounce** | Negative | **Passed** | `screenshots/qa-staff-wrong-role.png` |
| 2 | **Admin :5001** — login renders the new centered/dark console layout ("Admin Portal", "Sign in to continue") | Positive | **Passed** | `screenshots/qa-admin-login-redesign.png` |
| 3 | **Admin :5001** — enter a valid **staff** account → stays on `/login`, "This account doesn't have access to the Admin Portal." + "Open the Staff app →" link; **no bounce** | Negative | **Passed** | `screenshots/qa-admin-wrong-role.png` |
| 4 | **Admin :5001** — valid admin account → dashboard at `/` (happy path intact) | Positive | **Passed** | URL → `localhost:5001/` "Good morning" |

## Notes
- A `WAREHOUSE_MANAGER` is allowed in **both** apps (not rejected by either).
- Role check is UI convenience only; server-side role + scope authz is unchanged.
- `getAccessRole` decodes the `role` claim from the access token — never trusted for authorization (the API re-verifies the signed token).

No open defects.
