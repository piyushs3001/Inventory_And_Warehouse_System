---
name: qa-before-commit
description: Use when about to commit source changes (.ts/.tsx) — before running `git commit`. Drives writing positive + negative test cases for the change, running the full QA gate, fixing failures, and marking each step done before committing. Triggers on "commit", "ready to commit", or when the qa-guard PreToolUse hook denies a commit for missing tests.
---

# QA before commit

You are about to commit code. Before you run `git commit`, complete this checklist.
Create a TodoWrite item for each step and tick it off as you go — that is the
"mark done" mechanism.

## Boundary

This is the **commit-time automated-test** discipline (unit/integration `*.spec.ts`).
It is separate from the **Stop-hook** gate, which is interactive **Playwright MCP**
end-to-end QA of user-facing flows plus a `docs/qa/<flow>.md` report. Do both where
both apply; this skill covers the automated tests that gate the commit.

## Checklist

1. **Identify the change.** Run `git status` / `git diff`. List which files changed
   and which business rules / endpoints / components they touch.

2. **Write positive cases.** Colocated `*.spec.ts`. Each asserts the happy path
   produces the correct result or state transition.

3. **Write negative cases.** Cover, as applicable to the change (consult the matching
   project skill for the exact rule):
   - invalid input rejected — DTO / `class-validator`;
   - unauthorized **role or warehouse scope** blocked — `authorization-role-scope`;
   - illegal **state-machine transition** rejected — `domain-state-machines`;
   - **invariant preserved**, e.g. a quantity change writes its `StockMovement` in
     the same transaction — `stock-invariants-and-ledgers`;
   - boundary / empty / zero-row data handled.

4. **Run the gate.** `npm run qa:gate` (typecheck → lint → unit → build → e2e).

5. **Fix every failure**, then re-run `npm run qa:gate` until green. Mark this step
   done only when the gate passes.

6. **Commit.** The Husky wall re-runs `qa:gate` as the hard check, and the qa-guard
   PreToolUse hook is satisfied because test files now exist for the change.

## Escapes (use only for genuine no-code/WIP commits)

`git commit --no-verify` or `QA_GUARD_SKIP=1 git commit …` bypass both the wall and
the PreToolUse hook. Do not use them to skip writing tests for real behavior changes.
