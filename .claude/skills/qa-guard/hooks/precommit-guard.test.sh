#!/usr/bin/env bash
# Scenario tests for precommit-guard.sh. Run: bash precommit-guard.test.sh
set -uo pipefail
HERE=$(cd "$(dirname "$0")" && pwd)
GUARD="$HERE/precommit-guard.sh"
pass=0; fail=0; tmpdirs=()
cleanup() { for d in "${tmpdirs[@]:-}"; do [ -n "$d" ] && rm -rf "$d"; done; }
trap cleanup EXIT

mkrepo() {
  d=$(mktemp -d); tmpdirs+=("$d")
  git -C "$d" init -q
  git -C "$d" config user.email t@t; git -C "$d" config user.name t
  printf '%s' "$d"
}
run_guard() { # $1=command  $2=cwd
  printf '{"hook_event_name":"PreToolUse","tool_name":"Bash","tool_input":{"command":"%s"},"cwd":"%s"}' \
    "$1" "$2" | bash "$GUARD"
}
assert_deny()  { if echo "$1" | grep -q '"permissionDecision":"deny"'; then echo "ok: $2"; pass=$((pass+1)); else echo "FAIL: $2 :: $1"; fail=$((fail+1)); fi; }
assert_allow() { if echo "$1" | grep -q 'deny'; then echo "FAIL: $2 :: $1"; fail=$((fail+1)); else echo "ok: $2"; pass=$((pass+1)); fi; }

# 1. non-commit command → allow
out=$(run_guard "npm test" "$PWD"); assert_allow "$out" "non-commit command allowed"

# 2. git commit, source changed, no test → deny
r=$(mkrepo); mkdir -p "$r/src"; echo "x" > "$r/src/foo.ts"
out=$(run_guard "git commit -m wip" "$r"); assert_deny "$out" "source w/o test denied"

# 3. git commit, source + test changed → allow
echo "t" > "$r/src/foo.spec.ts"
out=$(run_guard "git commit -m wip" "$r"); assert_allow "$out" "source + spec allowed"

# 4. --no-verify → allow
r2=$(mkrepo); echo "x" > "$r2/bar.ts"
out=$(run_guard "git commit --no-verify -m wip" "$r2"); assert_allow "$out" "--no-verify allowed"

# 5. QA_GUARD_SKIP=1 → allow
export QA_GUARD_SKIP=1
out=$(run_guard "git commit -m wip" "$r2"); assert_allow "$out" "QA_GUARD_SKIP allowed"
unset QA_GUARD_SKIP

# 6. only non-ts changed → allow
r3=$(mkrepo); echo "# doc" > "$r3/README.md"
out=$(run_guard "git commit -m docs" "$r3"); assert_allow "$out" "non-ts change allowed"

# 7. only a spec changed (e.g. test-only commit) → allow
r4=$(mkrepo); mkdir -p "$r4/src"; echo "t" > "$r4/src/only.spec.ts"
out=$(run_guard "git commit -m test" "$r4"); assert_allow "$out" "spec-only change allowed"

# 8. non-commit git subcommand mentioning commit → allow (no false trigger)
out=$(run_guard "git log --grep commit" "$r"); assert_allow "$out" "git log not treated as commit"

# 9. web source .tsx changed, no test → deny
r5=$(mkrepo); mkdir -p "$r5/src/app"; echo "x" > "$r5/src/app/page.tsx"
out=$(run_guard "git commit -m wip" "$r5"); assert_deny "$out" "web .tsx source w/o test denied"

# 10. web .test.tsx recognized as a test → allow
echo "t" > "$r5/src/app/page.test.tsx"
out=$(run_guard "git commit -m wip" "$r5"); assert_allow "$out" "web .test.tsx recognized as test"

echo "---"; echo "pass=$pass fail=$fail"
[ "$fail" -eq 0 ]
