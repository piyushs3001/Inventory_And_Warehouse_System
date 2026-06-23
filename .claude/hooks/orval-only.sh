#!/usr/bin/env bash
# Orval-only API access gate (PostToolUse on Write|Edit).
#
# The web frontend must reach the API exclusively through the Orval-generated
# React-Query client (apps/web/src/lib/api/generated). This hook blocks app
# code that bypasses it with a hand-written axios import or a fetch() to the API.
#
# Allowed exceptions (never flagged):
#   - apps/web/src/lib/api/generated/**  (generated; regenerated wholesale)
#   - apps/web/src/lib/api/axios.ts      (the customInstance mutator)
#
# Disable via /hooks, or remove the PostToolUse hook from .claude/settings.json.

input=$(cat)

file=$(printf '%s' "$input" | jq -r '.tool_input.file_path // empty' 2>/dev/null)
[ -z "$file" ] && exit 0

# Only web source .ts/.tsx files.
case "$file" in
  *apps/web/src/*.ts|*apps/web/src/*.tsx) ;;
  *) exit 0 ;;
esac

# Sanctioned files.
case "$file" in
  *apps/web/src/lib/api/generated/*) exit 0 ;;
  *apps/web/src/lib/api/axios.ts) exit 0 ;;
esac

[ -f "$file" ] || exit 0

violations=""

# 1) Direct axios import / require in app code.
axios_hits=$(grep -nE "(from[[:space:]]+['\"]axios['\"]|require\(['\"]axios['\"]\))" "$file" 2>/dev/null)
if [ -n "$axios_hits" ]; then
  violations="${violations}- Direct axios import (use the generated client instead):\n${axios_hits}\n"
fi

# 2) fetch() aimed at the API (line references /api/ or an *_API_URL env).
fetch_hits=$(grep -nE "fetch\(" "$file" 2>/dev/null | grep -E "/api/|API_URL")
if [ -n "$fetch_hits" ]; then
  violations="${violations}- Raw fetch() to the API (use the generated React-Query hooks):\n${fetch_hits}\n"
fi

[ -z "$violations" ] && exit 0

reason="Orval-only API rule violated in ${file}. The web app must call the API only through the Orval-generated React-Query client in apps/web/src/lib/api/generated (Swagger -> Orval contract). Found:\n${violations}Fix: import the generated hook/type for this endpoint. If the endpoint does not exist yet, annotate the Nest controller, run 'npm run api:gen', then use the regenerated hook. The only file permitted to import axios directly is apps/web/src/lib/api/axios.ts."

# jq builds valid JSON and converts the \n escapes into real newlines in the string.
jq -n --arg r "$reason" '{decision:"block", reason:($r | gsub("\\\\n"; "\n"))}'
exit 0
