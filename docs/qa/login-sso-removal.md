# QA — Admin login redesign + remove "Continue with SSO" (Staff + Admin)

**Date:** 2026-06-20
**Flow:** Login pages — Staff App (`:5000/login`) and Admin Portal (`:5001/login`)
**Change (two parts):**
1. **Admin login redesigned** into a split-screen layout — an austere "command console" brand panel (`<aside>`, hidden under `lg`) beside a clean sign-in card, echoing the Staff app's structure. The "Admin Portal" badge now appears in two responsive slots (desktop panel + a `lg:hidden` card badge).
2. **Removed the inert "Continue with SSO"** button (and its "or" divider) from **both** login pages. SSO was never wired to a backend (only showed a "not configured" notice), so it was removed.

## Scope of change

| File | Change |
|---|---|
| `apps/admin/src/app/login/page.tsx` | **Redesigned** to split-screen brand panel + responsive "Admin Portal" badge; removed SSO button + "or" divider + unused `Shield` import |
| `apps/staff/src/app/login/page.tsx` | Removed SSO button + "or" divider; dropped unused `Shield` import; trimmed comment to "forgot-password" only |
| `apps/admin/src/app/login/page.test.tsx` | Updated the layout assertion `getByText('Admin Portal')` → `getAllByText(...).length > 0` (the redesign intentionally renders the badge in 2 responsive slots) |
| `apps/staff/src/app/login/page.test.tsx` | Removed the now-obsolete "Continue with SSO shows a not-configured notice" unit test |

The shared `notice` / `setNotice` state was **kept** — it is still used by the "Forgot password?" control on both pages.

## Build verification

| Check | Result |
|---|---|
| `typecheck` (staff + admin) | ✅ Passed |
| `lint` (admin) | ✅ Passed (clean) |
| `lint` (staff) | ✅ Passed for changed files (1 pre-existing unrelated warning in `(staff)/home/page.tsx` — `Package` unused) |
| `test -w staff` (unit) | ✅ 49 passed / 12 files |
| `test -w admin` (unit) | ✅ 56 passed — incl. the updated admin-login layout test |

## Browser QA (Playwright MCP)

| # | Scenario | Type | Result | Notes |
|---|---|---|---|---|
| 1 | Staff `/login` renders without "Continue with SSO" button | Positive | **Passed** | Button + "or" divider absent; Sign in, Forgot password, Create account tab present |
| 2 | Staff "Forgot password?" still shows its notice | Regression (negative) | **Passed** | "Password reset isn't available yet." renders — shared `notice` state intact |
| 3 | Admin `/login` renders without "Continue with SSO" button | Positive | **Passed** | Button + "or" divider absent; Sign in, Forgot password, "Go to the Staff app" link present |
| 4 | Admin "Forgot password?" still shows its notice | Regression (negative) | **Passed** | "Password reset isn't available yet — contact a Super Admin." renders |
| 5 | No new console errors introduced | Negative | **Passed** | Only the expected unauthenticated `GET /api/v1/auth/me` 404 on a fresh login page (pre-existing, session bootstrap) |
| 6 | Admin valid sign-in still works (→ dashboard) | Regression | **Passed** | Re-verified 2026-06-20: `admin@iws.local` signs in, lands on `/` |
| 7 | Staff valid sign-in still works (→ `/home`) | Regression | **Passed** | Re-verified: Warehouse Manager signs in, lands on `/home` |
| 8 | Staff invalid credentials rejected in place | Negative | **Passed** | Wrong password → "Invalid credentials", no navigation |
| 9 | Admin login renders the **redesigned** split-screen: brand panel ("Command over every warehouse."), governance footer ("Role-scoped access · Audit-logged · Approvals-first"), Admin Portal badge | Positive | **Passed** | `screenshots/qa-login-no-sso-admin.png` (full page) |
| 10 | Admin wrong-role (STAFF) rejected in place with a Staff-app link | Negative | **Passed** | Covered by admin unit test `rejects a valid STAFF account in place` |

**Screenshots:** `screenshots/qa-login-no-sso-staff.png`, `screenshots/qa-login-no-sso-admin.png`

## Bugs found

None.

## Deferred / not covered

- SSO itself remains unimplemented on the backend; this change simply removes the placeholder UI. If SSO is built later, the button must be re-added and wired.
- Forgot password remains an inert notice (needs email/SMTP) — intentionally left unchanged.

## Commit

Committed as a standalone `fix(web)` change; the Husky pre-commit ran the full `npm run qa:gate` (typecheck → lint → unit → build → e2e) green, so the e2e gate the original draft deferred has now run.
