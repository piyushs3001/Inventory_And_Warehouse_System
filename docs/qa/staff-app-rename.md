# QA — `apps/web` → `apps/staff` rename (split-apps Phase 2)

**Flow:** monorepo refactor — rename the web app to `apps/staff`
**Date:** 2026-06-16 · **Plan:** `docs/plans/2026-06-16-split-staff-admin-apps.md` (Phase 2)
**Nature:** **pure rename — no behaviour or content change.** `git mv apps/web apps/staff`; package `name` web→staff; root scripts `-w web`→`-w staff`; dropped the dead `client` script (orval moved to `@iws/api-client` in Phase 1). Still serves on **:5000**, still contains the admin routes (they move to `apps/admin` in Phase 3 — nothing orphaned).

## Verification (automated)
| Check | Result |
|---|---|
| typecheck (`staff` + packages + api) | **Passed** |
| unit tests (`staff`) | **Passed — 55** (unchanged) |
| `next build` (`staff`) | **Passed** — all 19 routes prerendered |

## Browser smoke (Playwright MCP, :5000, dev DB seeded)
| # | Scenario | Type | Result |
|---|---|---|---|
| 1 | `/login` renders styled on the renamed app | Positive | **Passed** |
| 2 | Valid login (`admin@iws.local`) → `/` → redirect → `/admin` "Good morning" dashboard | Positive | **Passed** |

UI is byte-identical to Phase 1 (`screenshots/qa-pkg-login.png`, `qa-pkg-admin.png`) — no new screenshot needed.

## Notes / deferred
- Admin routes (`/admin/*`) still live in the staff app **temporarily**; Phase 3 moves them to `apps/admin` (:5001) at root and adds per-app logins + role gates/bounce. Until then there is no behaviour change.
- API still on **:5001** (moves to :5002 in Phase 4).
- Phases 3–5 deferred.

No open defects.
