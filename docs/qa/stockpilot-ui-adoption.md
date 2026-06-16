# QA — Stockpilot UI Adoption

- **Flow:** Adopt the Stockpilot visual language into the existing single `apps/web` (design tokens + Inter, full shell, Admin Dashboard, Staff Home, table reskin).
- **Branch / worktree:** `stockpilot-ui-adoption`
- **Spec / plan:** `docs/superpowers/specs/2026-06-15-stockpilot-ui-adoption-design.md` · `docs/superpowers/plans/2026-06-15-stockpilot-ui-adoption.md`
- **QA date:** 2026-06-16 · **Surfaces:** Admin Portal (`/admin`) + Staff App (root)
- **Screenshots:** `docs/qa/screenshots/` (admin dashboard light + dark, staff home dark)

## How QA was run
Automated gate ran on **every** task commit via the Husky pre-commit wall (`npm run qa:gate` = typecheck → lint → unit → build → e2e). Browser QA was driven through the **Playwright MCP** against a self-contained worktree stack (web `:5100`, API `:5101`, CORS-matched, shared seeded dev DB) so the existing `:5000/:5001` dev servers were left untouched. Logged in as the seeded Super Admin (`admin@iws.local`).

> Note: the API was **not** changed by this work (all changes are `apps/web`), so the worktree API on `:5101` is functionally identical to the main one.

## Automated gate (all 14 implementation commits)
| Check | Result |
|---|---|
| typecheck (api + web) | ✅ Passed |
| lint (api + web) | ✅ Passed (0 warnings after T7 fix) |
| unit (api 60 + web 84) | ✅ Passed |
| build (api + web) | ✅ Passed |
| e2e (28, serial) | ✅ Passed |

Final web unit-test count: **84** (24 new/updated `*.test.tsx` across the new components + pages).

## Browser QA — scenarios

### Positive — Admin Portal (light + dark)
| # | Scenario | Result |
|---|---|---|
| A1 | `/login` renders ("Welcome back", work email, password + show/hide toggle) | ✅ Passed |
| A2 | Sign in with correct credentials → redirects to `/admin` dashboard | ✅ Passed |
| A3 | Dashboard: greeting "Good morning, Super" (comma-guarded), "sample data" subtitle, Export + New-PO buttons | ✅ Passed |
| A4 | 6 KPI cards render with values + up/down/flat delta chips (green/red/muted) | ✅ Passed |
| A5 | Inventory-Value **AreaChart** + Purchase-Orders **BarChart** render (SVG, no lib) | ✅ Passed |
| A6 | Warehouse-Utilization + Top-Products **ProgressBars** with threshold colors (≥90% red, ≥80% amber, else indigo — West Coast 92%=red, Northeast 88%=amber) | ✅ Passed |
| A7 | Recent-Activity feed uses **generic actor labels** ("Receiving clerk", "Warehouse manager", "System") | ✅ Passed |
| A8 | **AI Recommendations** card labeled **"Advisory"** (AI-as-draft rule) + Upcoming Deliveries | ✅ Passed |
| A9 | Section headings are `<h2>` under the page `<h1>` (no skipped level) | ✅ Passed |
| A10 | Sidebar: "IWS / Admin Portal", grouped nav (Operations/Purchasing/Logistics/Analytics/AI Center/Manage), gradient active-nav on Dashboard | ✅ Passed |
| A11 | Purchase Orders nav shows count badge **"14"** | ✅ Passed |
| A12 | Topbar: `⌘K` search, **Ask AI**, theme toggle, **Notifications** (with sr-only "Unread notifications"), **Warehouse switcher** | ✅ Passed |
| A13 | Warehouse switcher shows a real scoped warehouse ("Central Warehouse") from the live API | ✅ Passed |
| A14 | `/admin/warehouses` reskinned: "CW"/"ND" `EntityAvatar` initials, uppercase column headers, status badges; data still loads via Orval | ✅ Passed |
| A15 | Dark-mode toggle: brand **lightens to indigo (no pink tint)**, all surfaces/text legible, charts + deltas legible | ✅ Passed |
| A16 | Theme **persists** across navigation + browser reopen (toggle reflects `Switch to light mode` [pressed]) | ✅ Passed |

### Positive — Staff App
| # | Scenario | Result |
|---|---|---|
| S1 | `/home` renders greeting + "West Coast Hub · your tasks for today" | ✅ Passed |
| S2 | 2×4 **QuickActionCard** grid (Receive / Dispatch / Transfer / Count), each a link | ✅ Passed |
| S3 | "My Tasks Today" — 4 tasks with `StatusBadge`s (Due today / Pick list / In progress / Approved) + chevron links | ✅ Passed |
| S4 | "Pending Notifications" list | ✅ Passed |
| S5 | Sidebar shows "Staff App" + staff nav (Receive badge 2, Dispatch badge 5, Transfers, Count, View Inventory) | ✅ Passed |
| S6 | Staff topbar **omits Ask-AI and the warehouse switcher** (surface differentiation) | ✅ Passed |
| S7 | Headings `<h2>` under page `<h1>`; theme persists | ✅ Passed |

### Negative / boundary
| # | Scenario | Expected | Result |
|---|---|---|---|
| N1 | Visit an unbuilt nav route (`/admin/inventory`) | ComingSoon "Inventory arrives in Phase 3", full shell, **no 404** | ✅ Passed |
| N2 | Sign in with a **wrong password** | Stays on `/login`, surfaces typed **"Invalid credentials"** alert | ✅ Passed |
| N3 | **Log out** | Redirects to `/login`, session cleared | ✅ Passed |
| N4 | "Ask AI" control | Presentational only — no `onClick`/navigation; tooltip "AI assistant — arriving in Phase 7" | ✅ Passed (verified in code + markup; not wired) |
| N5 | Console errors during the flows | None (application) | ✅ Passed — only the expected **401** on N2 and a benign favicon 404; no JS/app errors |

## Bugs found & fix status
All defects were caught by the per-task adversarial code reviews and **fixed before each commit** (re-verified green):
| Bug | Where | Status |
|---|---|---|
| Dark-mode brand wouldn't lighten (`.dark` precedes `[data-theme]` in cascade) | T1 globals.css | ✅ Fixed (`.dark[data-theme="blue"]` higher-specificity rule) |
| `pageLabel` `startsWith` made `/admin` match `/admin/warehouses` | T2 nav-config | ✅ Fixed (exact-then-longest-prefix) |
| `NavItem` allowed `built:false` without a `phase` | T2 | ✅ Fixed (discriminated union) |
| `BarChart` had a dead `height` param (ESLint warning) | T7 | ✅ Fixed (removed) |
| `WarehouseSwitcher` `indexOf(current)` reference-fragile | T5 | ✅ Fixed (`findIndex` by id) + click-cycle test |
| Ask-AI `aria-label` announced the phase note | T5 | ✅ Fixed (note kept in `title` only) |
| **Personal names in source** ("Marcus Chen"/"Alex Kelantan") — violates the no-names rule | T12 mock + test | ✅ Fixed (generic role labels) |
| Heading skip `<h1>`→`<h3>` on dashboard | T12 | ✅ Fixed (`<h2>`) |
| Greeting dangling comma when name absent | T12 | ✅ Fixed (comma-guard) |
| `initials` coupled in `nav-config`; avatar duplicated; initials not `aria-hidden` | T14 | ✅ Fixed (moved to `@/lib/utils`, shared `EntityAvatar`, `aria-hidden`) |
| **`--color-primary-2` not registered in `@theme inline`** → `to-primary-2` gradient utility never compiled, so the logo + active-nav gradients fell back to primary→transparent in a production build (dev masked it) | Final integration review (globals.css) | ✅ Fixed — registered `--color-primary-2`; built CSS now emits `.to-primary-2{--tw-gradient-to:var(--primary-2)}` |
| Charts had generic duplicate `aria-label`s; `WarehouseSwitcher` vanished while loading; card radius 14px vs 16px mismatch | Final integration review | ✅ Fixed (label props, loading placeholder, unified 16px) |

The browser QA pass itself surfaced **no new defects** (all scenarios passed first time). The **final whole-branch integration review** caught the production-only gradient-token bug above — fixed and re-verified green.

## Deferred / not covered (honest)
- **Dashboard + Staff-Home figures are local sample data** (`*.mock.ts`, marked `TODO(phase-6)`) — by design; live figures arrive with Reports/Dashboard in Phase 6. Not a defect.
- **Role-vs-scope authz negative** (e.g. a Staff user blocked from `/admin`) **not re-tested** — only a Super Admin is seeded, and the role-gated layouts/authz were **not changed** by this UI work (server-side authz is covered by API e2e + the auth layers). Staff-surface UI was QA'd by visiting `/home` as the authenticated Super Admin (the surface is layout-driven, not role-driven).
- **Light-mode** screenshots captured for the Admin Dashboard; Staff Home + ComingSoon captured in **dark** only (both themes share the same token system, verified on the dashboard).
- Search box, Notifications panel, Export / New-PO buttons are **shell affordances** (no behavior yet) — wired in later phases.

## Outcome
**PASSED.** The Stockpilot look is adopted into the existing single-app architecture with the real Orval API intact, both surfaces and both themes render faithfully (indigo brand, no pink), unbuilt routes degrade gracefully to ComingSoon, and the negative paths behave correctly. Mock data is confined to the dashboard + home as designed.
