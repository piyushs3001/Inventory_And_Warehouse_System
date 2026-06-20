# QA — Forgot Password / Reset Password (Staff + Admin)

> **Date:** 2026-06-20 · **Flow:** Self-service password reset on both apps, backed by Gmail SMTP.
> **Branch:** `feat-forgot-password` (worktree) · **Spec:** `docs/superpowers/specs/2026-06-20-forgot-password-design.md` · **Plan:** `docs/superpowers/plans/2026-06-20-forgot-password.md`

## What was built
- API: `PasswordResetToken` model (sha256-hashed, 1h, single-use); `MailService` (nodemailer/Gmail SMTP, degrades when unconfigured); `POST /auth/forgot-password`, `POST /auth/reset-password`, `GET /auth/reset-password/validate`.
- Both apps: `/forgot-password` + `/reset-password` pages; login "Forgot password?" rewired from an inert notice to a `/forgot-password` link.
- Reset email links back to the **requesting** app (staff→:5000, admin→:5001).

## Automated verification (full `qa:gate` equivalent)
| Step | Result |
|---|---|
| Typecheck (all 6 workspaces) | **Passed** |
| Lint (api/staff/admin) | **Passed** (1 pre-existing unused-import warning, not in this change) |
| Unit — api (Jest) | **Passed** — 139 tests (incl. new MailService 4 + AuthService reset 11) |
| Unit — staff (Vitest) | **Passed** — 54 (incl. forgot 2 + reset 3 + login forgot-link) |
| Unit — admin (Vitest) | **Passed** — 62 (incl. forgot 2 + reset 3 + login forgot-link) |
| Build (api + both apps) | **Passed** — `/forgot-password` + `/reset-password` routes emitted on both apps |
| e2e — api (Supertest, serial) | **Passed** — 144 tests across 19 suites (incl. new `auth-password-reset.e2e-spec.ts`: 6) |

The new e2e suite covers: forgot returns generic 200 for known **and** unknown email (no enumeration); validate true→false across a reset; full reset → login with the new password succeeds; expired/used/invalid token → 400; short password → 400.

## Browser QA (Playwright MCP)
Driven against worktree servers (API :5099, staff :5097, admin :5098 — alternate ports to avoid the already-running main-checkout servers). SMTP configured; reset token read from the API dev log.

### Staff app
| # | Scenario | Type | Result |
|---|---|---|---|
| S1 | Login page "Forgot password?" is a link to `/forgot-password` | + | **Passed** |
| S2 | `/forgot-password` renders (public, no auth bounce) | + | **Passed** |
| S3 | Submit known email → generic "Check your inbox" confirmation | + | **Passed** |
| S4 | `/reset-password` with valid token → password form | + | **Passed** |
| S5 | Submit matching new password → "Password updated" | + | **Passed** |
| S6 | Login with the **new** password → reaches `/home` | + | **Passed** |
| S7 | `/reset-password` with a bogus token → "Link expired" state | − | **Passed** |
| S8 | Mismatched passwords → "Passwords do not match", no API call | − | **Passed** |
| S9 | Reuse the already-used token → "Link expired" (single-use) | − | **Passed** |

### Admin app
| # | Scenario | Type | Result |
|---|---|---|---|
| A1 | Login "Forgot password?" → `/forgot-password` link | + | **Passed** |
| A2 | Submit admin email → generic confirmation; reset link points back to the **admin** app (:5098) | + | **Passed** |
| A3 | Valid token → reset form (Admin Portal styling) | + | **Passed** |
| A4 | Submit matching new password → "Password updated" | + | **Passed** |
| A5 | Login with the **new** password → admin dashboard | + | **Passed** |

### Real email delivery
| # | Scenario | Result |
|---|---|---|
| E1 | Forgot-password for an ACTIVE Gmail account → message sent via `smtp.gmail.com:465` with **0 send errors** | **Passed** (SMTP accepted; inbox/spam receipt to be confirmed by recipient) |

Evidence: each scenario above was driven live through the Playwright MCP and verified via the page accessibility snapshot at each step (staff `/home` reached after reset; admin dashboard reached after reset). Screenshots were captured during the run but are held in the MCP server's out-of-tree output and are not retained in the repo.

## Bugs found & fixed during the pass
| Issue | Severity | Status |
|---|---|---|
| 4 lint errors in new test files (`no-unsafe-*`, `require-await`) | Low | **Fixed** — typed mock tuples; non-async mock impl |
| React lint error: synchronous `setState` inside the reset page effect | Low | **Fixed** — initialize token state from token presence; effect no longer sets state synchronously |
| Leftover `notice` render in admin login after rewiring the forgot control | Low (build break) | **Fixed** — removed dead state + render |

## Security notes (verified)
- No user enumeration: forgot always returns the same generic 200; reset returns generic 400 on any bad/expired/used token.
- Tokens stored sha256-hashed (raw only in the email); 1-hour expiry; single-use; a new request invalidates prior tokens.
- A successful reset nulls `hashedRefreshToken` (existing sessions are logged out).

## Not covered / deferred
- Automated assertion of real **inbox delivery** (only the SMTP send is verified; recipient confirms receipt). The Gmail App Password lives only in the gitignored `apps/api/.env`; **recommend rotating it** since it was shared in chat.
- No "change password while logged in" flow, no password-changed confirmation email, no CAPTCHA (throttling only) — all out of scope.

## Environment note
QA mutated the shared dev `iws` DB (e2e wipes users; reset flows changed seed-user passwords). After QA the seed users were restored (`admin@iws.local`/`Admin@12345`, `staff@iws.local`/`Staff@12345`) and the temporary `piyushs.spaceo@gmail.com` test user removed.
