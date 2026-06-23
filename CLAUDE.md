# CLAUDE.md

The **build contract** for Claude Code. Read `docs/PRD.md` for full detail; this is the operational subset needed to write correct code without re-reading it.

# Inventory & Warehouse System

Staff app + admin portal for inventory, warehouses, suppliers, stock movements, POs, reporting, and AI across multiple warehouses. Two surfaces, one backend + data model: **Staff App** (web + mobile) for floor ops (receive, dispatch, count, transfer, scan); **Admin Portal** for config, oversight, approvals, reporting.

## Roles & Scope

Authorization is **two layers, both server-side**: (1) **role** = what kinds of action; (2) **warehouse scope** = which warehouses' data. Every warehouse-bound query is filtered by scope, then gated by role. UI hiding is not security.

- **Super Admin** — global: warehouses, users, permissions, settings, all reports.
- **Warehouse Manager** — assigned warehouses: stock, POs, transfers, approvals (full control in scope).
- **Staff** — assigned warehouses: receive, dispatch, count, view.
- **Supplier** *(optional)* — no scope; sees only own POs, updates delivery status.

**Account creation (PRD §3.0):** admin-invite **or** public self-registration (`POST /auth/register`). Self-signup is always `STAFF`, no scope, status `PENDING_APPROVAL` — role/scope never taken from the client — and **cannot log in** until a Super Admin approves (`POST /users/:id/activate` → `ACTIVE`) and assigns scope. Login reveals the pending state only to a caller with valid credentials; everything else is a generic 401.

## Current State (read first)

**Greenfield:** only `CLAUDE.md` + `docs/PRD.md` exist — no code, no `package.json`, no Prisma schema, not yet a git repo. Everything below is the *target*. When scaffolding (NestJS + Next.js), define build/lint/test in `package.json`, then **record the run/build/test/migrate commands here**. Start from the **Build Order**.

**Local infrastructure (applies to ALL build phases — no Docker):** PostgreSQL runs **natively on the local machine** and is already running. Do **not** add Docker, `docker-compose`, or containerized DB/services to any phase; connect to the existing local Postgres via `DATABASE_URL`. The `pgvector` extension must be enabled on that instance (`CREATE EXTENSION IF NOT EXISTS vector;`). Any phase that says "spin up Postgres" or references a containerized service means **use the local instance instead**.

**QA gate:** `npm run qa:gate` (typecheck → lint → unit → build → e2e) runs as the Husky `pre-commit` wall — every commit must pass it. The local `qa-guard` plugin's `qa-before-commit` skill drives writing positive + negative cases; its PreToolUse hook blocks a commit when source changed without `*.spec.ts`. Escapes for genuine no-code commits: `git commit --no-verify` / `QA_GUARD_SKIP=1`.

## Tech Stack (LOCKED — don't change without updating PRD §11.0)

| Layer | Choice | | Layer | Choice |
|---|---|---|---|---|
| Frontend | Next.js (App Router) + Tailwind + shadcn/ui | | Database | PostgreSQL + pgvector |
| Backend | NestJS | | AI | LangChain + OpenAI/Gemini |
| ORM | Prisma | | Storage | MinIO (local) / AWS S3 (prod) |
| Auth | JWT (access + refresh) | | | |

Lock is deliberate: a JS/TS learning project, so Nest/Prisma over faster-to-ship Laravel. *(pgvector was included for an LLM/RAG Chat Assistant; that path isn't pursued — no provider key — so it's currently unused. Revisit whether to keep it in the lock.)* Don't relitigate mid-build — surface conflicts.

## Architecture Rules

- **Backend = one NestJS module per domain:** `auth`, `users`, `warehouses`, `products`, `inventory`, `suppliers`, `purchase-orders`, `transfers`, `stock-counts`, `movements`, `reports`, `ai`, `notifications`. Each: controller → service → repository (Prisma). Business logic lives in services — controllers only validate (DTO) and delegate.
- **Frontend = two separate Next.js apps, one per surface** (see `docs/plans/2026-06-16-split-staff-admin-apps.md`): **`apps/staff`** (`:5000`, Staff App) and **`apps/admin`** (`:5001`, Admin Portal), each its own project with its **own login page** and nav. Each gates by role in the UI (staff = `STAFF`+`WAREHOUSE_MANAGER`; admin = `SUPER_ADMIN`+`WAREHOUSE_MANAGER`; wrong-role login bounces to the other app) — **UI gating only; server-side role + scope authz is unchanged.** Shared infra lives in workspace **packages**: `@iws/ui` (design tokens + components), `@iws/api-client` (generated client + axios + token-store), `@iws/auth` (`AuthProvider`/`useRequireAuth`). App-shell/nav are per-app. Server components for data-heavy pages; client for forms/scanning.
- **Frontend talks to the API ONLY through the Orval-generated client.** The contract flow is **Swagger → Orval**: annotate the Nest controller, run `npm run api:gen`, then consume the regenerated React-Query hooks + model types from **`@iws/api-client`** (`packages/api-client/src/generated`), imported by both apps. **No hand-written `axios`/`fetch` to the API in app code, and never hand-edit `generated/` (it is `clean: true` — regenerated wholesale).** The *only* file allowed to import `axios` directly is the mutator **`packages/api-client/src/axios.ts`** (`customInstance`); everything else imports from the generated client. New endpoint needed → change the backend + regenerate, don't bypass with a manual call.
- **One `InventoryItem` per (Product/Variant × Warehouse).** Stock is per-warehouse; same SKU, independent quantities per location.

## Non-Negotiable Invariants

- **Audit trail:** every quantity change writes a `StockMovement` (user, time, before/after, type, reason, ref) in the **same transaction** as the `InventoryItem` update. No change without a movement.
- **Two-layer authz:** every warehouse-bound query filtered by **scope** AND gated by **role** — server-side.
- **Append-only ledgers:** `StockMovement` and `ActivityLog` never updated or deleted.
- **AI never acts autonomously:** drafts/suggestions only (e.g. PO Generator → Draft POs). Human approves before send/commit.
- **Soft-delete** products/warehouses with stock or history; never hard-delete.

## Stock State Model

A SKU at a warehouse splits into four buckets: `available + reserved + damaged + inTransit` (together = full picture). Transitions move qty between buckets, each writing one `StockMovement`: **Reserve** (Available → Reserved, stays in warehouse); **Receive** (increases Available; damaged → Damaged); **Transfer out** (source Available → In-Transit); **Transfer in** (In-Transit → destination Available); **Adjust** incl. count reconciliation (corrects a bucket with a reason). **Movement types (closed set):** `Receive · Transfer · Adjustment · Sale · Return`.

## State Machines

- **Purchase Order:** `Draft → Sent → Approved → Partially Received → Completed`. Approval may be required by settings/threshold. Receiving reconciles ordered vs received per line; short receipt → *Partially Received*.
- **Stock Transfer:** `Request → Approve → Receive`. Request: source Available → In-Transit; approver (Manager/Admin) approves; destination receive: In-Transit → Available. Each leg writes a Transfer movement.
- **Stock Count:** session → enter counted → **variance = counted − recorded** → reconcile writes an **Adjustment** (with reason) to match physical reality.

## Ledgers — two distinct logs

- **`StockMovement`** — *quantity* changes only; backbone of audit + AI forecasting.
- **`ActivityLog`** — *all* meaningful actions (create/update/delete/approve/receive/transfer/adjust) with user, time, entity, before/after. Both append-only; a quantity change writes both, a non-quantity action (e.g. edit supplier) writes only ActivityLog.

## Conventions

- **Language:** TypeScript everywhere, `strict` on. No `any` without justification.
- **Validation:** DTOs via `class-validator` at the controller boundary. Never trust client input for scope/role.
- **Transactions:** any multi-write (stock change + movement) in one Prisma transaction; no partial writes.
- **API:** REST, JSON, `/api/v1`, plural nouns, standard HTTP codes. All endpoints auth'd; scoped endpoints filtered by caller's scope.
- **Naming:** files `kebab-case`; classes `PascalCase`; vars/fns `camelCase`; DB `snake_case` (Prisma `@map`).
- **Money/qty:** integer minor units or `Decimal` — never float. Stock value = Σ (qty × cost price).
- **Errors:** throw NestJS `HttpException`s; never leak internals. **Secrets:** env vars only (`.env`, never committed); validate at boot.
- **Auth:** argon2/bcrypt hashing; access + refresh JWTs; guard resolves role + scope per request.
- **Storage:** images, delivery notes, damage photos, exports → S3/MinIO; serve via signed URLs. **Indexing:** index inventory + movements by (product, warehouse, date); paginate movement/report queries.

- **Commits:** Conventional Commits with workspace scope — `feat(api|web):`, `fix(...)`, `chore:`, `docs:`. One logical change per commit, small and reviewable. Work on `piyush`; PRs target `main`.
- **Tests:** unit specs colocated as `*.spec.ts`; API e2e under `apps/api/test` runs **serially**. Every business rule (stock invariants, state-machine transitions, authz scope) gets a test; a bug fix gets its regression test first.

## Rule Files (`.claude/rules/` — path-scoped, auto-load on matching files)

Detailed, enforceable rules live outside this file so they don't bloat it — don't restate them here, consult the matching file. Each is a `.claude/rules/*.md` with `paths:` frontmatter, so it loads into context only when Claude touches a matching file.

- **`authorization-role-scope`** — api `*.controller/service/guard/repository/decorator.ts`: two-layer (role + warehouse scope) server-side authz; fail-closed; never trust client input for scope/role.
- **`stock-invariants-and-ledgers`** — api `inventory|movements|transfers|stock-counts|purchase-orders|goods-receipts` modules: four buckets, same-transaction `StockMovement`, append-only ledgers, no `Float`.
- **`domain-state-machines`** — api `purchase-orders|goods-receipts|transfers|stock-counts` modules: legal status transitions, approvals, ordered-vs-received reconciliation, variance.
- **`nestjs-api-conventions`** — api `*.controller/service/module/dto.ts`: controller→service→repository layering, thin controllers, DTO validation, Swagger annotations, ConfigService.
- **`prisma-schema-and-migrations`** — `**/prisma/**`, `**/*.prisma`: db:migrate flow, `@@map`, no `Float`, soft-delete, indexes.
- **`api-contract-and-orval-client`** — api controllers/DTOs + web `lib/api/**`, `orval.config.ts`: Swagger→Orval, `npm run api:gen`, generated-client-only.

(`.claude/skills/` holds the **`qa-guard`** plugin — the QA-before-commit gate — and the **`run-apps`** skill: launch API/Staff/Admin **+ the dev log viewer** with port-conflict checks, `setsid`/`nohup` detach, and scoped (never broad `pkill`) shutdown.)

## Agents (`.claude/agents/` — dispatched on demand)

Delegate the relevant Definition-of-Done step to a focused subagent when work matches its trigger:

- **`qa-tester`** — QA a changed user-facing flow end-to-end via Playwright MCP (positive + negative) and write `docs/qa/<flow>.md`. *(Requires the Playwright MCP server connected.)*
- **`invariant-reviewer`** — read-only audit of a backend diff against the invariant skills (authz/scope, ledgers, state machines, layering, no `Float`).
- **`code-reviewer`** — read-only "Optimize"-step review for quality, structure adherence, and efficiency (dead code, duplication, naming/layering, N+1s, unindexed/unbounded queries, `any`). Complements `invariant-reviewer`; doesn't re-check correctness/security.
- **`contract-guardian`** — after API changes, verify Swagger annotations + run `api:gen` + confirm `openapi.json`/`generated` are in sync.

## Data Model (core entities)

`User` (role, status; M:N Warehouses = scope) · `Warehouse` · `Category` · `Product` (sku, costPrice, sellingPrice, reorderLevel) · `ProductVariant` (own sku/barcode) · `InventoryItem` (available/reserved/damaged/inTransit; unique per Product-or-Variant × Warehouse) · `Supplier` · `PurchaseOrder` + `PurchaseOrderLine` (qty, unitCost, receivedQty) · `GoodsReceipt` · `StockTransfer` · `StockCount` · `StockMovement` · `Notification` · `ActivityLog`.

## AI Features (drafts/suggestions only)

Postgres-backed, all scope-respecting: Forecasting, Reorder Assistant, Chat Assistant (keyword lookup over inventory — full LLM/RAG not pursued, no provider key), Report Summarizer, PO Generator (Reorder + Forecasting → **Draft** POs for review). *(LangChain/OpenAI/Gemini + pgvector RAG are not active — no provider key; forecasts/reorder/summaries are statistical/templated.)*

## Build Order (PRD §12)

Auth & Users → Warehouses → Products → **Inventory + movement ledger (build early — everything writes to it)** → Suppliers → POs + Goods Receiving → Stock Transfer → Stock Counting → Reports + Export → Dashboard → Notifications/Logs → AI (Chat & Summarizer, then Reorder, Forecasting, PO Generator last).

## Definition of Done (after every task — automatic, STRICT)

This runs after **every** task, no exceptions. Audit both ways — adversarially (where does this break, what invariant slips, what's the negative path) **and** constructively (does it actually do the job, is it the simplest correct shape).

1. **Audit the diff — both directions.** Read it negatively (bugs, errors, edge cases, invariant violations, the failure/negative path) and positively (correctness, completeness, simplicity). Find every defect.
2. **Fix** every bug, type error, lint warning you found. No known defects left.
3. **Optimize** (only if there's a real win) — kill dead code, duplication, N+1s, unindexed lookups. Cleanups only; don't gold-plate.
4. **Verify the build** — build, typecheck, lint, unit/e2e tests pass. Add/adjust tests for any rule changed. Must be a clean build.
5. **QA the flow with Playwright MCP — like a professional QA.** Drive the actual affected flow end-to-end through the Playwright MCP, both **positive** (happy path works) and **negative** (invalid input, unauthorized role/scope, wrong state-machine transition, empty/boundary data — all rejected correctly). Treat it as real QA, not a smoke test.
6. **Fix** every bug or error the QA pass surfaces, then re-run step 5 until the flow is clean both ways.
7. **Write a QA report (`.md`).** After the QA pass, create/update a markdown report under `docs/qa/` (e.g. `docs/qa/<feature-or-flow>.md`) capturing: what was tested (each scenario, positive and negative), result per case (**Passed / Failed / Blocked / Pending / Skipped**), bugs found and their fix status, anything not covered or deferred, and the date + flow/task it belongs to. Update the same file on re-runs rather than scattering duplicates.
8. **Report honestly** — if anything fails or is skipped, say so with evidence, and link the QA report.

## Working Agreement

- Match existing patterns before adding new ones; a growing file means a module doing too much.
- Test business rules, especially stock invariants and state machines.
- When a rule here conflicts with a request, surface it — don't silently break an invariant.
- Prefer small, reviewable changes over rewrites.