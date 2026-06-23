#!/usr/bin/env bash
# Advisory PostToolUse typecheck.
#
# Surfaces TypeScript errors immediately after an Edit/Write so buggy first-pass
# code is caught at edit time instead of at the commit wall (`qa:gate`) or in a
# later re-audit. ADVISORY ONLY: it never blocks the tool call (always exits 0);
# it just prints failures so they land in context.
#
# Note: `npm run typecheck` runs the whole monorepo (6 workspaces) and can take a
# while. If it slows you down, remove the "typecheck" PostToolUse entry from
# .claude/settings.json — the Stop-stage `qa:gate` still typechecks before commit.
set +e
cd "${CLAUDE_PROJECT_DIR:-.}" || exit 0

out="$(npm run typecheck --silent 2>&1)"
status=$?
if [ "$status" -ne 0 ]; then
  echo "⚠️  Advisory typecheck failed after this edit (fix before committing):"
  printf '%s\n' "$out" | grep -E 'error TS|error:' | head -n 25
fi
exit 0
