---
name: run-apps
description: Use when asked to start, launch, run, or boot the dev servers (API, Staff app, Admin portal) together for local QA or browsing. Launches them so they survive task-slot teardown, checks for port conflicts first, and verifies each responds.
---

# Run the dev servers (API + Staff + Admin)

Launch the three services for local work/QA. Ports and commands are fixed by this repo:

| Service | Command | Port |
|---|---|---|
| API (NestJS) | `npm run dev:api` | `5002` |
| Staff app (Next.js) | `npm run dev:staff` | `5000` |
| Admin portal (Next.js) | `npm run dev:admin` | `5001` |

## Rules (these exist because of real, repeated failures)

1. **Check ports BEFORE launching.** A stray dev server — often from a git worktree — silently steals the port and the app comes up wrong or not at all. Check `5000`, `5001`, `5002` first:
   ```bash
   for p in 5000 5001 5002; do printf 'port %s: ' "$p"; lsof -ti tcp:"$p" || echo free; done
   ```
2. **Launch detached so the harness teardown (SIGTERM / exit 143) doesn't kill them.** Use `setsid` + `nohup` and redirect output to `./logs/<service>.log` (the dev log viewer tails these); never leave them attached to the tool shell:
   ```bash
   mkdir -p logs
   setsid nohup npm run dev:api   >logs/api.log   2>&1 &
   setsid nohup npm run dev:staff >logs/staff.log 2>&1 &
   setsid nohup npm run dev:admin >logs/admin.log 2>&1 &
   ```
   (Run each in the repo root via the background-capable shell.)

   **One URL for all logs:** start the dev log viewer too — it tails `logs/{api,staff,admin}.log` together with per-source/level/text filters at `http://localhost:5009`:
   ```bash
   setsid nohup npm run dev:logs >logs/viewer.log 2>&1 &
   ```
3. **NEVER use a broad `pkill`/`killall` pattern** — `pkill -f node` (and similar) has self-killed Claude's own shell here, twice. Kill by **port** or **exact PID** only:
   ```bash
   # kill exactly what's on a port:
   lsof -ti tcp:5002 | xargs -r kill
   ```
4. **Verify each responds before reporting success** — don't assume "started" means "serving". Poll until ready (don't block on a fixed sleep):
   ```bash
   for url in http://localhost:5002/api/v1 http://localhost:5000 http://localhost:5001; do
     printf '%s -> ' "$url"; curl -s -o /dev/null -w '%{http_code}\n' --max-time 3 "$url" || echo down
   done
   ```
   For real browser QA, drive the Staff/Admin URLs through the Playwright MCP rather than curl.

## Stopping them

Stop by port, one at a time — never broad patterns:
```bash
for p in 5000 5001 5002; do lsof -ti tcp:"$p" | xargs -r kill; done
```
