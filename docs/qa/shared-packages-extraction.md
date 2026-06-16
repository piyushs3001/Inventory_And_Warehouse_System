# QA — Shared `@iws/*` Packages Extraction (split-apps Phase 1)

**Flow:** monorepo refactor — extract shared code into `packages/{api-client, ui, auth}`
**Date:** 2026-06-16 · **Plan:** `docs/plans/2026-06-16-split-staff-admin-apps.md` (Phase 1)
**Nature:** **pure structural refactor — no behaviour change.** `apps/web` is still the single app on `:5000`; it now sources shared code from `@iws/*`. QA goal: prove **no runtime regression** through the new package boundary.

## Verification (automated)
| Check | Result |
|---|---|
| typecheck (`@iws/api-client`, `@iws/ui`, `@iws/auth`, `api`, `web`) | **Passed** |
| unit tests | **Passed — 94 total, exactly preserved** (api-client 9 · ui 24 · auth 6 · web 55) |
| `next build` (web) | **Passed** — all 19 routes prerendered (`transpilePackages` + Tailwind `@source` working) |
| lint (web) | **Passed** |

## Browser smoke (Playwright MCP, :5000, dev DB seeded)
Login exercises all three packages at once (`@iws/ui` render · `@iws/auth` `useAuth` · `@iws/api-client` axios+hooks).

| # | Scenario | Type | Result | Evidence |
|---|---|---|---|---|
| 1 | `/login` renders fully styled (art panel, glows, floating cards, tabs, inputs) — confirms `@iws/ui` + tokens + Tailwind `@source` at runtime | Positive | **Passed** | `screenshots/qa-pkg-login.png` |
| 2 | Invalid credentials → `alert` "Invalid credentials" (`@iws/auth`→`@iws/api-client`→API 401→render) | Negative | **Passed** | API 401 in console + visible alert |
| 3 | Valid login (`admin@iws.local`) → redirect to `/admin` (full auth flow + `tokenStore`) | Positive | **Passed** | URL → `/admin` |
| 4 | `/admin` dashboard renders — app-shell + ~15 `@iws/ui` widgets (KpiCard, Area/BarChart, ProgressBar thresholds, StatusBadge, warehouse switcher) | Positive | **Passed** | `screenshots/qa-pkg-admin.png` |
| 5 | Console clean apart from the expected unauth bootstrap (`/auth/me` 401 → `/auth/refresh` 403) + the deliberate bad-cred 401 | — | **Passed** | console log |

## Bugs found & fixed during this phase
1. **Double-quote imports missed.** shadcn primitives use `"@/lib/utils"` (double quotes); the first single-quote sed left 9 broken imports → `@iws/ui` typecheck failed. **Fixed** (both quote styles rewritten); re-typecheck green.
2. **Barrel over-mock.** `app-shell.test.tsx` mocked the whole `@iws/api-client` barrel and dropped the `Role` enum that `nav-config` needs. **Fixed** with `vi.mock(..., async (importOriginal) => ({ ...await importOriginal(), <override> }))`; web tests green (55).

## Notes / deferred
- A flaky observation (not a defect): the dev server's **Fast Refresh** remounted the page mid-test on first route compile, clearing form state; re-running after compile was clean (scenario 2 passed). Same `waitFor`-under-load flake class seen in the baseline commit.
- **Package lint** is not yet wired into the root `lint`/`qa:gate` (only `api` + `web`); moved code was already lint-clean. Folded into **Phase 5**.
- Phases **2–5** (split `apps/web`→`apps/staff`, new `apps/admin`, API→`:5002`+CORS, glue/docs/QA both apps) **deferred** — not started.

No open defects. Phase 1 is clean both ways.
