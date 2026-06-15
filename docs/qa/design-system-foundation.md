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

## Slices C–E — not started
C (AppShell) · D (screen retrofit) · E (full `qa:gate` + Playwright browser QA + a11y pass). Each updates this report on completion.
