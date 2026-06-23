#!/usr/bin/env bash
# QA / Definition-of-Done gate (Stop hook).
#
# Blocks Claude from ending a turn when source (.ts/.tsx) files have changed
# but no Playwright-MCP QA report (docs/qa/<flow>.md) is present in the working
# tree. The gate clears as soon as a QA report appears, so it cannot loop.
#
# Disable temporarily via /hooks, or permanently by removing the "Stop" hook
# from .claude/settings.json.

input=$(cat)

# Loop guard: if we're already inside a stop-hook continuation, allow.
if printf '%s' "$input" | jq -e '.stop_hook_active == true' >/dev/null 2>&1; then
  exit 0
fi

cd "${CLAUDE_PROJECT_DIR:-.}" 2>/dev/null || true

# -uall lists individual untracked files; without it git collapses a new
# directory to "?? dir/" and the .ts/.tsx match below would miss new files.
changed=$(git status --porcelain --untracked-files=all 2>/dev/null)

# Source files touched this round (excluding the QA report dir itself).
code=$(printf '%s\n' "$changed" | grep -E '\.(ts|tsx)$' | grep -vE 'docs/qa/')

# A QA report satisfies the gate. NOTE: docs/ is gitignored (.gitignore `docs/*`),
# so `git status` never lists docs/qa/*.md — we must look at the filesystem and
# compare mtimes instead. The gate clears when at least one docs/qa/*.md is as new
# as (or newer than) the most-recently-changed source file: i.e. a QA report was
# (re)written for this round of code changes.
newest_code_mtime=0
while IFS= read -r f; do
  [ -z "$f" ] && continue
  [ -f "$f" ] || continue
  m=$(stat -c %Y "$f" 2>/dev/null || echo 0)
  [ "$m" -gt "$newest_code_mtime" ] && newest_code_mtime=$m
done < <(printf '%s\n' "$code" | sed -E 's/^.{3}//' | tr -d '"')

newest_qa_mtime=0
while IFS= read -r f; do
  [ -z "$f" ] && continue
  m=$(stat -c %Y "$f" 2>/dev/null || echo 0)
  [ "$m" -gt "$newest_qa_mtime" ] && newest_qa_mtime=$m
done < <(find docs/qa -maxdepth 1 -name '*.md' 2>/dev/null)

if [ -n "$code" ] && [ "$newest_qa_mtime" -le "$newest_code_mtime" ]; then
  cat <<'JSON'
{"decision":"block","reason":"Definition of Done not complete: source (.ts/.tsx) files changed but no docs/qa/<flow>.md QA report is present in the working tree. Before stopping you MUST: (1) audit the diff both ways (adversarial + constructive) and fix every defect; (2) verify a clean build/typecheck/lint/tests; (3) run Playwright MCP QA on the affected flow covering BOTH positive and negative paths (invalid input, unauthorized role/scope, illegal state-machine transitions, boundary/empty data); (4) fix everything QA surfaces and re-run until clean; (5) write or update docs/qa/<flow>.md recording each scenario with result Passed/Failed/Blocked/Pending/Skipped, bugs found + fix status, and what is deferred. Creating that QA report clears this gate."}
JSON
  exit 0
fi

exit 0
