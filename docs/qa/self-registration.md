# QA — Self-Registration → Approval → Login

**Flow:** `POST /auth/register` + login gating + `/admin/users` approval
**Date:** 2026-06-16 · **Plan:** `docs/plans/2026-06-16-self-registration.md`
**Build:** branch `piyush`; web `:5000`, API `:5001`; dev DB seeded (`admin@iws.local` / `Admin@12345`)
**Method:** Playwright MCP end-to-end (real app), plus api unit/e2e + web unit.

## Results

| # | Scenario | Type | Result | Evidence |
|---|---|---|---|---|
| 1 | Register (name/email/password, confirm match, terms) → account created, switches to Sign in with awaiting-approval banner | Positive | **Passed** | `screenshots/qa-login-register-success.png` |
| 2 | Created account is `STAFF`, no scope, `PENDING_APPROVAL`, no tokens returned | Positive | **Passed** | e2e + `/admin/users` row |
| 3 | Pending account login → blocked with "Your account is awaiting administrator approval." | Negative | **Passed** | `screenshots/qa-login-pending-403.png` |
| 4 | `/admin/users` shows the pending user with a **Pending** badge + **Approve** action | Positive | **Passed** | `screenshots/qa-admin-users-pending.png` |
| 5 | Admin clicks **Approve** → status flips to **Active**, action becomes Deactivate | Positive | **Passed** | post-approve table snapshot |
| 6 | Approved user logs in → redirected to `/home` (STAFF surface) | Positive | **Passed** | URL → `/home` |
| 7 | Register with an existing email → 409 "Email already in use" (stays on register tab) | Negative | **Passed** | web unit + e2e |
| 8 | Register with mismatched passwords → blocked client-side, API never called | Negative | **Passed** | web unit |
| 9 | Register with invalid email / short password → 400 | Negative | **Passed** | e2e |
| 10 | Client-supplied `role: SUPER_ADMIN` / `status: ACTIVE` on register → ignored (forced STAFF + PENDING_APPROVAL) | Negative (security) | **Passed** | e2e |
| 11 | Non-admin (STAFF) calling `POST /users/:id/activate` → 403 | Negative (authz) | **Passed** | e2e |
| 12 | Pending status not leaked on a wrong password → generic 401 (no enumeration) | Negative (security) | **Passed** | api unit |

**Automated:** api unit **63** ✓ · api e2e **33** ✓ · web unit **94** ✓ · typecheck/lint/build ✓ · `api:gen` in sync.

## Bug found & fixed during QA
- **Sign-in mislabeled a 403 as a network error.** The handler only special-cased 401, so the pending-approval 403 showed "Unable to reach the server." **Fixed:** surface the server message for any 4xx; only a missing HTTP response is treated as a network failure. Regression test added (`page.test.tsx` — "surfaces the API message on a 403"). Re-QA'd → scenario 3 passes.

## Notes
- A QA artifact user `rosa@iws.local` (now ACTIVE) remains in the **dev** DB — harmless; cleared by the next e2e run / re-seed.
- No open defects.

## Deferred
SSO + password-reset (still inert in the UI) — blocked on an OAuth provider / email transport. See `docs/qa/login-screen-wireframe-parity.md`.
