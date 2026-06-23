#!/usr/bin/env bash
# SessionStart hook — inject the design system into context every session so all
# apps/web UI work stays consistent with docs/design/design.md.
# Reads the file fresh each session, so edits to design.md are always reflected.
set -euo pipefail

f="${CLAUDE_PROJECT_DIR:-.}/docs/design/design.md"
[ -f "$f" ] || exit 0   # no design.md yet → no-op

jq -n --rawfile c "$f" '{
  hookSpecificOutput: {
    hookEventName: "SessionStart",
    additionalContext: (
      "IWS DESIGN SYSTEM (docs/design/design.md) — the visual + UX contract. Follow it for ALL apps/web UI work: use the tokens, keep brand vs status colours separate, tint in srgb (never oklch-toward-white), and respect the two-surface (Staff/Admin) structure. Full system below:\n\n" + $c
    )
  }
}'
