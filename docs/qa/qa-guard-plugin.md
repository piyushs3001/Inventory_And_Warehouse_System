# QA — qa-guard plugin

**Date:** 2026-06-13 · **Flow:** QA-before-commit gate (Husky wall + PreToolUse hook + skill)

## Scope
Hook/shell behavior of the qa-guard plugin and the Husky pre-commit wall. No
user-facing UI flow, so no Playwright run — verification is scenario tests of the
guard script plus live commit probes. Plugin **load/activation** scenarios require a
fresh Claude Code session (plugins load on session start), so those are **Pending** a
restart and called out below.

## Scenarios & results

| # | Scenario | Type | Result |
|---|---|---|---|
| 1 | Non-commit Bash command (`npm test`) → guard allows | Positive | Passed |
| 2 | `git commit` with source `.ts` changed, no spec → guard denies | Negative | Passed |
| 3 | `git commit` with source + matching `*.spec.ts` → guard allows | Positive | Passed |
| 4 | `git commit --no-verify` → guard allows | Negative (escape) | Passed |
| 5 | `QA_GUARD_SKIP=1 git commit` → guard allows | Negative (escape) | Passed |
| 6 | `git commit` with only non-ts (README) → guard allows | Positive | Passed |
| 7 | `git commit` with only a spec file → guard allows | Positive | Passed |
| 8 | `git log --grep commit` → not treated as a commit, allows | Negative (no false trigger) | Passed |
| 9 | `git commit` with web source `.tsx`, no test → guard denies | Negative | Passed |
| 10 | `git commit` with web `.test.tsx` present → guard allows (web test naming) | Positive | Passed |
| 11 | Husky probe hook aborts a commit (`exit 1`) | Negative | Passed |
| 12 | `git commit --no-verify` bypasses the Husky wall | Negative (escape) | Passed |
| 13 | Real `qa:gate` wall runs + passes on a green tree (wall commit `45e59c3`) | Positive | Passed |
| 14 | Plugin loads (`qa-guard@skills-dir`), `qa-before-commit` skill listed, live in-session PreToolUse deny, `${CLAUDE_PLUGIN_ROOT}` resolves | Positive | **Pending** (needs fresh session) |

Scenarios 1–10 are the automated guard suite (`precommit-guard.test.sh`, 10/10 pass) — the
suite covers both api (`*.spec.ts`) and web (`*.test.tsx`) test-file naming.
Scenarios 11–13 were observed live during execution (probe fired + aborted; `--no-verify`
bypassed; the wall commit ran the full gate — typecheck/lint/unit/build/e2e — before landing).

## Build gate
Full `qa:gate` verified green this session: typecheck ✓ · lint ✓ · unit **12 suites / 35 tests** ✓ · build (api + web) ✓ · e2e **6 suites / 15 tests** ✓. Confirmed live by the wall on commit `45e59c3`.

## Bugs found / fix status
- None. TDD: the deny case (#2) was RED before the script existed, GREEN after.

## Pending / deferred
- **Scenario 12 (Pending):** plugin activation is verified only after a Claude session
  restart. On restart, confirm `qa-guard@skills-dir` in `/plugin`, that
  `qa-before-commit` is listed, and that a real in-session `git commit` of an untested
  source file is denied. **If the hook does not fire**, switch `hooks.json`'s command to
  the project-relative fallback
  `bash "${CLAUDE_PROJECT_DIR}/.claude/skills/qa-guard/hooks/precommit-guard.sh"`
  and re-verify; record which form worked here.
- `build` + `test:e2e` on every commit is slow by design; a `pre-push` split is the
  documented future option if commit latency becomes painful.
- Cross-platform (Windows) launcher not implemented — repo is Linux/single-dev.
