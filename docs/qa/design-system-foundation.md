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

## Slices B–E — not started
B (component layer) · C (AppShell) · D (screen retrofit) · E (full `qa:gate` + Playwright browser QA + a11y pass). Each updates this report on completion.
