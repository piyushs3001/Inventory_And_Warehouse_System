#!/usr/bin/env bash
# qa-guard PreToolUse hook (Bash). On a `git commit`, deny if source (.ts/.tsx)
# changed in the working tree but no test file (*.spec.ts) did — nudging Claude
# to run the qa-before-commit skill first. No-op for any other command.
set -uo pipefail
input=$(cat)

cmd=$(printf '%s' "$input" | jq -r '.tool_input.command // empty')
cwd=$(printf '%s' "$input" | jq -r '.cwd // empty')

# Only act on a `git … commit` invocation (allow flags between git and commit;
# do NOT match e.g. `git log --grep commit` or `git status && echo commit`).
if ! printf '%s' "$cmd" | grep -Eq '\bgit\b([[:space:]]+-[^[:space:]]+)*[[:space:]]+commit\b'; then
  exit 0
fi

# Escape hatches for intentional no-test commits.
[ "${QA_GUARD_SKIP:-}" = "1" ] && exit 0
printf '%s' "$cmd" | grep -q -- '--no-verify' && exit 0

cd "${cwd:-${CLAUDE_PROJECT_DIR:-.}}" 2>/dev/null || exit 0

changed=$(git status --porcelain --untracked-files=all 2>/dev/null || true)
# Test files: api uses *.spec.ts; web uses *.test.ts(x); e2e uses *.e2e-spec.ts.
src=$(printf '%s\n' "$changed" | grep -E '\.(ts|tsx)$' \
  | grep -vE '\.spec\.tsx?$|\.test\.tsx?$|\.e2e-spec\.ts$|/generated/|(^|/)docs/qa/' || true)
tests=$(printf '%s\n' "$changed" | grep -E '\.spec\.tsx?$|\.test\.tsx?$|e2e-spec' || true)

if [ -n "$src" ] && [ -z "$tests" ]; then
  cat <<'JSON'
{"hookSpecificOutput":{"hookEventName":"PreToolUse","permissionDecision":"deny","permissionDecisionReason":"qa-guard: source (.ts/.tsx) changed but no test files (*.spec.ts) are present in the working tree. Run the qa-before-commit skill — write positive + negative cases for this change, run `npm run qa:gate`, fix failures, then commit. Intentional no-test commit (docs/chore)? use `git commit --no-verify` or prefix QA_GUARD_SKIP=1."}}
JSON
  exit 0
fi
exit 0
