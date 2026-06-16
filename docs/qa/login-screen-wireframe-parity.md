# QA — Login Screen (wireframe parity)

**Flow:** `/login` — Staff App + Admin Portal shared auth screen
**Date:** 2026-06-16
**Build:** branch `piyush`; web dev on `:5000`, API on `:5001`; dev DB re-seeded (`admin@iws.local` / `Admin@12345`)
**Scope:** reskin `/login` to full visual parity with `docs/design/wireframe.html` (`#login`) — tabs, glows, floating cards, animations, SSO/forgot/register controls. Sign-in wired to the real `POST /auth/login`. Register / SSO / forgot-password are **UI-only pending backend** (see *Deferred*).

## Method
Playwright MCP, viewport 1440×900 (desktop, so the `lg`/`xl` art panel + floating cards render). Positive + negative paths driven through the real running app.

## Results

| # | Scenario | Type | Result | Evidence |
|---|---|---|---|---|
| 1 | Page renders: art panel (brandmark, eyebrow, hero, 3 ticks), 2 corner glows, 3 floating cards (`$842k`, Low-stock, PO-1042), footer stats; right card with tabs + sign-in form | Positive | **Passed** | `screenshots/qa-login-light.png` |
| 2 | Floating cards drift (`floaty` 6s, staggered 0/1.6/3.1s) | Positive | **Passed** | visual (animation token `--animate-floaty`) |
| 3 | Password eye toggle masks/reveals; `type="button"` (no submit) | Positive | **Passed** | snapshot + unit tests |
| 4 | Tabs: switch Sign in ↔ Create account; `role=tablist`/`tab` + `aria-selected` | Positive | **Passed** | `screenshots/qa-login-register.png` |
| 5 | Register password strength meter fills 0→4 bars by complexity | Positive | **Passed** | `screenshots/qa-login-register.png` (4/4 green) |
| 6 | "New to IWS? Create an account" link opens register panel | Positive | **Passed** | unit test |
| 7 | Dark mode (`.dark`): surfaces invert, brand gradient lightens, status colors intact | Positive | **Passed** | `screenshots/qa-login-dark.png` |
| 8 | Valid login (`admin@iws.local` / `Admin@12345`) → redirect to `/admin` | Positive | **Passed** | URL → `http://localhost:5000/admin` |
| 9 | Invalid password → `role="alert"` "Invalid credentials" (no redirect) | Negative | **Passed** | `screenshots/qa-login-error.png` |
| 10 | "Continue with SSO" → "Single sign-on isn't configured yet." (no auth call) | Negative | **Passed** | waited for text; visible |
| 11 | "Forgot password?" → "Password reset isn't available yet." (no auth call) | Negative | **Passed** | waited for text; visible |
| 12 | Register submit → now **wired for real** (`POST /auth/register`, pending approval) | — | **Built** | see `self-registration.md` |

**Unit tests:** `apps/web/src/app/login/page.test.tsx` — 13 passed (sign-in success/401/network, eye toggle ×3, tabs ×3, pending controls ×3). Full web suite: **90 passed / 38 files**. Typecheck ✓, lint ✓ (0 warnings), `next build` ✓ (`/login` prerendered).

## Console
2 baseline errors on load — `GET /auth/me` 401 → `GET /auth/refresh` 403 — the **expected unauthenticated bootstrap** (stale/absent token cleared by `AuthProvider`), not caused by this change. A 3rd 401 appears on the deliberate bad-credential submit (scenario 9). No new client-side errors.

## Known deviation (by design)
- **Brand hue:** the screen uses the app's live `--primary` (indigo, hue ~277°, set during the Stockpilot reskin) so it matches every other screen — the wireframe's blue theme is hue ~250°. The brand hue is a **global design-system token**; shifting the whole app to 250° is a separate decision, out of scope for the login screen.
- **Body font:** app uses Inter (global `--font-sans`); the wireframe demos IBM Plex Sans. Mono numerals (`$842k`, stats) use IBM Plex Mono in both. Kept Inter for app consistency.

## Backend wiring status
"Build them for real" was requested for the three no-backend controls:
- **Register** — ✅ **Built** (self-registration → pending approval). PRD §3.0 + CLAUDE.md updated. QA: `self-registration.md`.
- **SSO** — still inert; blocked on an OAuth/OIDC provider + client credentials.
- **Forgot password** — still inert; blocked on an email transport + reset-token model + `/reset-password` page.

No defects open. Frontend slice is clean both ways.
