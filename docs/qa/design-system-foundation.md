# QA — Design-System Foundation

**Flow/Task:** Port the approved IWS design system (`docs/design/design.md` + `wireframe.html`) into `apps/web` as the foundation, then retrofit the 4 built screens. **Branch/worktree:** `design-system-foundation` (off `piyush` @ `c61b641`).
**Plan:** `docs/superpowers/plans/2026-06-15-design-system-foundation.md` · **Spec:** `docs/superpowers/specs/2026-06-15-design-system-foundation-design.md`.

Built in sequential slices (A foundation → B components → C AppShell → D screens → E DoD/browser-QA). This report is **updated per slice**; the comprehensive Playwright-MCP browser QA (light + dark, positive + negative over the retrofitted screens) lands at **Slice E**.

---

## Slice A — Foundation (tokens, fonts, theming) · 2026-06-15

### What was built
- **A1** `layout.tsx` — Geist → **IBM Plex Sans/Mono** (`--font-sans`/`--font-mono`); `<html data-theme="blue" suppressHydrationWarning>`.
- **A2** `globals.css` — full IWS token system: `:root`/`.dark` neutrals + **status palette** (`--ok/reserved/transit/danger/warn/warn-ink`) + shadows (design.md §1.1–1.2); 5 `[data-theme]` brand blocks (§1.3, blue active); **srgb-only** derived tints + shadcn aliases (§1.4); `@theme inline` registration of the new utility tokens + radius ratios (0.62/0.82/1/1.5).
- **A3** `providers.tsx` — `next-themes` `ThemeProvider` (`attribute="class"`, light default, `enableSystem={false}`, blue fixed).
- **A4** `theme-toggle.tsx` (+ test) — light/dark toggle; SSR-safe mounted flag via `useSyncExternalStore` (avoids the project's `react-hooks/set-state-in-effect` rule); `type="button"`, dynamic `aria-label`, `aria-pressed`.
- **A5** mounted the toggle in both route-group layout headers (temporary home until the Slice C AppShell topbar).
- **Infra:** `vitest.setup.ts` gained a `window.matchMedia` mock (jsdom lacks it; `next-themes` calls it) — no assertions weakened.

### Verification method
Automated (`qa:gate` components) **+ two-stage subagent review** (spec-compliance, then code-quality). **Browser (Playwright-MCP) QA is deferred to Slice E** — justified: the app is only partially restyled until Slices B–D (components/screens still on stock shadcn shapes), so a meaningful visual pass belongs after the screens are retrofitted. Slice A's user-facing mechanism (the dark toggle) is unit-tested both directions, and the token system is build-verified (Tailwind compiles the new utilities).

### Scenarios & results

| # | Scenario (▲ positive / ▼ negative) | Layer | Result |
|---|---|---|---|
| 1 | ▲ IBM Plex Sans/Mono load; `<html data-theme="blue">` + font vars present | build + code review | **Passed** |
| 2 | ▲ Token system compiles; new utilities (`bg-ok-tint`, `text-warn-ink`, `bg-primary-tint`, `shadow-md`) generate | `next build -w web` | **Passed** |
| 3 | ▼ No `color-mix(in oklch, … white)` tints anywhere (the "blue→pink" guard) | grep (A2 step 7) | **Passed** (no matches) |
| 4 | ▲ shadcn `--accent` stays **neutral** (`--surface-2`), not brand | spec review | **Passed** |
| 5 | ▲ `ThemeProvider` wraps tree; light default, blue fixed, system disabled | code review | **Passed** |
| 6 | ▲ ThemeToggle in light mode → click calls `setTheme('dark')` | unit | **Passed** |
| 7 | ▲ ThemeToggle in dark mode → click calls `setTheme('light')` | unit (review follow-up) | **Passed** |
| 8 | ▼ Toggle is `type="button"` (never submits a form) + has an `aria-label` | unit | **Passed** |
| 9 | ▲ Mounted flag is SSR-safe via `useSyncExternalStore` (no setState-in-effect → lint clean) | lint + code review | **Passed** |
| 10 | ▲ Existing `providers` test stays green with the new provider | unit | **Passed** |
| 11 | ▲ Scope contained — only 8 files; no surface switch / theme-switcher UI / component or screen changes | spec review | **Passed** |

### Build gate
typecheck ✓ · lint ✓ · unit **api 53 / web 42** ✓ (web = 39 baseline + 3 ThemeToggle) · build (api + web) ✓. *(e2e not re-run for this slice — api unchanged; it runs once at Slice E with a dev-DB reseed.)*

### Reviews
- **Spec compliance:** ✅ — every token value matches design.md verbatim; srgb tints confirmed; no over-build.
- **Code quality:** ✅ Approve — no Critical/Important. One actionable Minor (ThemeToggle covered only light→dark) **fixed** (commit `9572e1b`, added the dark→light branch). Optional polish (a brand-themes comment, a defensive `var()` fallback) accepted as-is.

### Bugs found / fixed
- **Test coverage gap (code review):** `ThemeToggle` test only exercised light→dark. **Fixed** — made the next-themes mock's `resolvedTheme` mutable and added the dark→light case (`9572e1b`).
- No defects in the implementation itself.

### Pending / deferred
- **Comprehensive Playwright-MCP browser QA (light + dark, positive + negative)** over the retrofitted screens → **Slice E**. That pass will also clear the still-pending **Phase 1.5 auth/user-management** and **Phase 2 warehouses** browser-QA gates (`docs/qa/warehouses-management.md`, etc.).
- The toggle currently lives in the layout headers; Slice C relocates it into the glass `AppShell` topbar.

### Commits (branch `design-system-foundation`)
`424fd56` fonts · `bfeee1c` tokens · `b827283` ThemeProvider · `05e42e3` ThemeToggle · `f6c4425` mount toggle · `9572e1b` dark→light test.

---

## Slice B — Component layer · 2026-06-15

### What was built
- **B1** `status-badge.tsx` (+ test) — IWS status colour vocabulary as pill badges: `ok / reserved / transit / warn / danger / muted / brand` tones. Uses `bg-ok-tint text-ok`, `bg-warn-tint text-warn-ink`, `bg-danger-tint text-destructive / border-destructive` (no unregistered `--color-danger`), `bg-primary-tint text-primary`. Dot + label (colour is never the sole differentiator).
- **B2** `button.tsx` — added `accent` variant (`bg-brand-accent text-brand-accent-foreground hover:bg-brand-accent/90`). No other changes to existing variants.
- **B3** `stat-card.tsx` (+ test) — tinted icon chip + label + big mono value + optional trend. Tones: `brand / ok / warn / reserved / transit`.
- **B4** `empty-state.tsx` (+ test) — dashed border container; icon chip + title + description + optional CTA.
- **B4** `error-state.tsx` (+ test) — `TriangleAlertIcon` + `text-destructive` title + description + optional CTA; `bg-danger-tint / border-destructive/20`.
- **B4** `skeleton.tsx` (+ test) — `animate-pulse rounded-md bg-surface-2`, `data-slot="skeleton"`.
- **B4** `page-head.tsx` (+ test) — `<h1>` + description + right-aligned actions slot; `mb-6 flex items-start gap-4`.
- **Not modified:** `card.tsx`, `input.tsx`, `label.tsx`, `table.tsx`, `dialog.tsx`, `select.tsx`, `sonner.tsx`, `badge.tsx` — already token-driven from Slice A. No screens or layouts touched.

### Verification method
TDD (RED→GREEN for all new components except B2 which is a one-line additive edit) + typecheck + lint + unit + build. **Browser (Playwright-MCP) QA deferred to Slice E** — components are built but screens are not yet retrofitted (Slice D), so visual browser QA belongs after screen retrofit.

### Scenarios & results

| # | Scenario (▲ positive / ▼ negative) | Layer | Result |
|---|---|---|---|
| 1 | ▲ `StatusBadge tone="ok"` renders its label text | unit | **Passed** |
| 2 | ▲ `StatusBadge tone="warn"` applies `text-warn-ink` class | unit | **Passed** |
| 3 | ▼ `--color-danger` NOT used (unregistered token guard) — danger uses `text-destructive / border-destructive / bg-danger-tint` | code review | **Passed** |
| 4 | ▲ Dot + label always present (colour not sole differentiator) | code review | **Passed** |
| 5 | ▲ `Button variant="accent"` added without breaking existing variants | typecheck + build | **Passed** |
| 6 | ▲ `StatCard` renders label and numeric value | unit | **Passed** |
| 7 | ▲ `EmptyState` renders title and description | unit | **Passed** |
| 8 | ▲ `ErrorState` renders default title; custom title override works | unit | **Passed** |
| 9 | ▲ `Skeleton` has `animate-pulse` class | unit | **Passed** |
| 10 | ▲ `PageHead` renders `<h1>` + description + action nodes | unit | **Passed** |
| 11 | ▼ `card.tsx / input.tsx / label.tsx / table.tsx / dialog.tsx / select.tsx / sonner.tsx / badge.tsx` NOT modified | git diff review | **Passed** |
| 12 | ▼ No deferred components built (CompositionBar, Stepper, ScanBar, etc.) | git diff review | **Passed** |

### Build gate
typecheck ✓ · lint ✓ · unit **api 53 / web 52** ✓ (web = 42 baseline + 10 new Slice B tests) · build (api + web) ✓. *(e2e not re-run — api unchanged; runs at Slice E with dev-DB reseed.)*

### Reviews
- **Spec compliance:** ✅ — all 6 components present; danger correctly uses `text-destructive`/`border-destructive` (no unregistered `--color-danger`); `badge.tsx` + all other base components untouched (StatusBadge is a separate file); no deferred components; no screen/layout changes.
- **Code quality:** ✅ **Approve-with-minor** — no Critical/Important; `any`-free; cva/derived-type patterns match the repo; tests assert real output. The EmptyState/ErrorState shape overlap was judged **not** worth factoring. Two consistency minors **deferred to Slice D** (see below).

### Bugs found / fixed
None. All components were implemented correctly on first pass. TDD RED→GREEN confirmed for B1 and B3.

### Pending / deferred
- **Comprehensive Playwright-MCP browser QA (light + dark, positive + negative)** → **Slice E** (after Slices C AppShell + D screen retrofit land).
- Table mono-numeric/SKU-chip treatments are usage-level classNames applied in Slice D, not component changes.
- **Deferred code-quality minors (→ Slice D, when these components are consumed):** (1) the four plain-`div` components (`StatCard`/`EmptyState`/`ErrorState`/`PageHead`) don't forward `...props` — extend `ComponentProps<'div'>` + spread when a caller needs `id`/`aria-*` (note the `title`-prop vs HTML-`title` collision to handle then); (2) align their prop-typing/formatting to the repo's named-type + one-prop-per-line convention. Both low-urgency per the reviewer.

### Commits (branch `design-system-foundation`)
`e589b88` StatusBadge · `26b264c` accent button variant · `7a72e07` StatCard · `97cfc22` EmptyState/ErrorState/Skeleton/PageHead.

---

## Slice C — AppShell · 2026-06-15

### What was built
- **`nav-config.ts`** — typed, grouped, role-gated nav (`NAV: Record<Surface, NavGroup[]>`): staff→Home (all roles); admin "Manage"→Users + Warehouses (SUPER_ADMIN only); commented slots for future Operations/Insights/AI groups. Plus `SURFACE_LABEL` (full), **`SURFACE_CRUMB`** (short, breadcrumb), `roleLabel`, `initials`, `pageLabel`.
- **`sidebar.tsx`** — 248px aside: brand mark (`SURFACE_LABEL`), mono section headers, role-filtered items, active = `bg-primary-tint` + `text-primary` + 3px left accent bar (`aria-current="page"`), `UserMenu` foot.
- **`topbar.tsx`** — glass header (`backdrop-blur`), breadcrumb (`SURFACE_CRUMB` · `pageLabel`) + `ThemeToggle`.
- **`user-menu.tsx`** (rebuilt) — avatar initials + name + role + `Log out` (icon button) → `useAuth().logout` then `/login`.
- **`app-shell.tsx`** — composes Sidebar + Topbar + scrollable `<main>` (p-7); both route-group layouts now render `<AppShell surface=…>`, keeping their `useRequireAuth` guard. **Deleted** old `nav.tsx` + `nav.test.tsx`.

### Verification method
TDD per component + full gate (typecheck/lint/unit/build). **Browser (Playwright-MCP) QA → Slice E** (after screen retrofit).

### Scenarios & results
| # | Scenario (▲ positive / ▼ negative) | Layer | Result |
|---|---|---|---|
| 1 | ▲ Admin Sidebar (SUPER_ADMIN) shows "Manage" → Users + Warehouses | unit | **Passed** |
| 2 | ▼ Staff Sidebar (STAFF role) shows Home, **never** the admin Users link | unit | **Passed** |
| 3 | ▲ Active route gets `aria-current="page"` + accent bar | unit | **Passed** |
| 4 | ▲ Topbar breadcrumb = short surface ("Admin") · page ("Users") — distinct from sidebar's full "Admin Portal" | unit | **Passed** |
| 5 | ▲ `UserMenu` renders name + role and logs out → `/login` | unit | **Passed** |
| 6 | ▲ `AppShell` renders sidebar + topbar + children | unit | **Passed** |
| 7 | ▲ Both layouts consume `AppShell`; admin still role-gates SUPER_ADMIN | code review | **Passed** |
| 8 | ▼ Old `nav.tsx`/`nav.test.tsx` deleted; no dangling imports | git diff review | **Passed** |
| 9 | ▲ Routes intact (`/`,`/admin`,`/admin/users`,`/admin/warehouses`,`/home`,`/login`) | `next build` | **Passed** |

### Build gate
typecheck ✓ · lint ✓ · unit **api 53 / web 57** ✓ · build ✓.

### Reviews
- **Spec compliance:** ✅ — all 7 checkpoints; `SURFACE_CRUMB` fix correctly wired; no UI-component/screen changes; old `nav` cleanly removed.
- **Code quality:** ✅ **Approve** — clean extraction (both layouts collapsed to one shell), sound nav-config typing, role-gating tested against rendered output, no `any`. Minors all cosmetic/dormant.

### Bugs found / fixed
- **Plan gap (during impl):** `nav-config` originally reused `SURFACE_LABEL` for both the sidebar brand label and the topbar breadcrumb → duplicate "Admin Portal" text (failed the AppShell test) and diverged from the wireframe's short crumb. **Fixed** — added `SURFACE_CRUMB` (`Staff`/`Admin`) for the breadcrumb; sidebar keeps the full label (`a33028b`).

### Pending / deferred
- **Comprehensive Playwright-MCP browser QA** → **Slice E**.
- **Dormant minor (track):** `pageLabel`'s fallback title-cases only the first char, so a future kebab route (e.g. `/admin/stock-counts`) would render "Stock-counts". No current route hits it; harden when such a route arrives.

### Commits
`7d4d5ac` nav-config · `d1d9c66` UserMenu · `709ff5e` Sidebar · `4a401ca` Topbar · `a33028b` SURFACE_CRUMB fix · `f8a375a` AppShell + layouts + remove Nav.

---

## Slice D — Screen retrofit · 2026-06-15

### What was built
- **D1** `page-head.tsx` / `empty-state.tsx` / `error-state.tsx` — `Omit<ComponentProps<'div'>, 'title'>` named prop types + `...props` spread; `stat-card.tsx` — `ComponentProps<'div'>` (no `title` collision) + `...props` spread. No behaviour change; existing component tests stayed green.
- **D2** `login/page.tsx` — replaced the Card-wrapped centered form with a two-column brand-panel layout (`lg:grid-cols-[1.1fr_1fr]`): left `<aside>` (brand mark, headline, feature checklist, stat strip — decorative, `hidden lg:flex`); right auth card (`<h1>Welcome back`, `<p>Sign in to…`). Fixed the one token violation: `text-red-600` → `text-destructive`. State hooks (`email`, `password`, `showPassword`, `error`, `submitting`) + full `onSubmit` logic kept byte-for-byte. Dropped unused `Card*` imports; added `Check` to the lucide import. Sign-in only (no register tab).
- **D3** `admin/users/page.tsx` — `<PageHead title="Users" actions={<Button>New user</Button>}>` replaces the inline header. `<Badge variant>` → `<StatusBadge tone={ACTIVE→'ok', else 'muted'}>`. Loading state → 5 `<Skeleton className="h-12 w-full" />` rows; loaded-empty → `<EmptyState title="No users yet" …>`; else `<Table>` wrapped in `<div className="rounded-xl bg-card ring-1 ring-foreground/10 overflow-hidden">`. All hooks/handlers/dialogs untouched.
- **D4** `admin/warehouses/page.tsx` — same pattern: `<PageHead title="Warehouses" actions={<>label toggle + New warehouse button</>}>`. Status → `<StatusBadge tone>`. Capacity column: `<TableHead className="text-right">` + `<TableCell className="text-right font-mono tabular-nums">`. Loading/empty/card-frame states. All hooks/handlers/dialogs untouched.
- **D5** `(staff)/home/page.tsx` — replaced the inline heading with `<PageHead title="Welcome, {name}">` + `<EmptyState icon={<Inbox>} title="Your dashboard is coming soon" description="…">`. No fake numbers. `useAuth` call kept.

### Verification method
All tests run after each task; full gate (typecheck/lint/unit/build) at D6. **Browser (Playwright-MCP) QA → Slice E** (comprehensive light+dark, +/- paths over all retrofitted screens).

### Scenarios & results

| # | Scenario (▲ positive / ▼ negative) | Layer | Result |
|---|---|---|---|
| 1 | ▲ D1: `page-head`/`empty-state`/`error-state` forward `...props`; `stat-card` too; `Omit<…,'title'>` avoids HTML collision | typecheck + unit | **Passed** |
| 2 | ▲ D1: all 7 existing component tests stay green (no behaviour change) | unit | **Passed** |
| 3 | ▲ D2: login brand panel renders at `lg` with mark + headline + checklist + stat strip | build | **Passed** |
| 4 | ▼ D2: `text-red-600` removed — error uses `text-destructive` | grep + code review | **Passed** |
| 5 | ▲ D2: `onSubmit` logic byte-for-byte identical; `Card*` imports removed; `Check` added | code review | **Passed** |
| 6 | ▲ D2: all 6 login tests pass — email/password fields, eye-toggle aria-labels, 401 vs network error, `role="alert"`, type="button" | unit | **Passed** |
| 7 | ▲ D3: `PageHead` header; `New user` button still findable `getByRole('button', {name:/new user/i})` | unit | **Passed** |
| 8 | ▲ D3: status cell renders `StatusBadge` with ACTIVE→`ok` / INACTIVE→`muted` tone | unit | **Passed** |
| 9 | ▲ D3: `Skeleton` loading state; `EmptyState` for zero rows; card-framed `Table` | build + code review | **Passed** |
| 10 | ▼ D3: all generated hooks (`useUsersControllerFindAll`, `useUsersControllerDeactivate`, `getUsersControllerFindAllQueryKey`, `queryClient.invalidateQueries`, dialogs) untouched | git diff | **Passed** |
| 11 | ▲ D4: `PageHead` with include-archived toggle + `New warehouse` button in actions | unit | **Passed** |
| 12 | ▲ D4: Capacity column header + cell `text-right font-mono tabular-nums` | build + code review | **Passed** |
| 13 | ▲ D4: Archive button still present only for ACTIVE rows (1 of 2) | unit | **Passed** |
| 14 | ▼ D4: all generated hooks + `invalidateList` + `onArchive` + dialogs (`currentStaffIds`, `onSuccess`) untouched | git diff | **Passed** |
| 15 | ▲ D5: `PageHead` with dynamic welcome title + `EmptyState` with `Inbox` icon | typecheck + build | **Passed** |
| 16 | ▼ D5: no fake stat numbers in the empty-state | code review | **Passed** |
| 17 | ▲ D6 full gate: typecheck + lint + unit (api 53 / web 57) + build — all PASS | D6 gate | **Passed** |
| 18 | ▼ No `text-red-600` or other hardcoded colour tokens in login/users/warehouses/home pages | grep | **Passed** |

### Build gate
typecheck ✓ · lint ✓ · unit **api 53 / web 57** ✓ (web = 57 baseline from Slice C; Slice D adds no new spec files — screen files are already covered by their existing page tests) · build (api + web, all 6 routes) ✓. *(e2e not re-run — api unchanged; runs at Slice E with dev-DB reseed.)*

### Reviews
- **Data logic unchanged (confirmed by diff):** all generated TanStack-Query hooks, `useAuth` calls, `onSubmit` error handling, `queryClient.invalidateQueries`, dialog props (`onClose`/`onSuccess`/`currentStaffIds`) are byte-for-byte identical across D2–D5.
- **Token compliance:** zero hardcoded colours; `text-destructive` now correct in the login error; status tones map to registered palette (`ok`/`muted`); mono-numeric uses registered `font-mono tabular-nums`.

### Bugs found / fixed
- None. All tasks passed on first run. The one pre-existing token violation (`text-red-600`) was the planned fix in D2.

### Pending / deferred
- **Comprehensive Playwright-MCP browser QA (light + dark, positive + negative)** over all 4 retrofitted screens → **Slice E**. That pass also clears the pending Phase 1.5 auth/user-management and Phase 2 warehouses browser-QA gates.

### Commits (branch `design-system-foundation`)
`3a7e26a` D1 props polish · `b8d40c7` D2 login brand panel · `5c36e8a` D3 users retrofit · `9985e50` D4 warehouses retrofit · `4153713` D5 staff home retrofit.

---

## Slice E — not started
Full `qa:gate` (typecheck/lint/unit/build/e2e, reseed dev DB) + **Playwright-MCP browser QA** (light+dark, positive+negative over all 4 screens + AppShell nav, a11y pass). Clears pending 1.5 + warehouses browser QA. Updates this report on completion.
