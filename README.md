# Inventory & Warehouse System

Staff-facing web/mobile app **+** admin portal for inventory, warehouses, suppliers, stock movements, purchase orders, reporting, and AI — across multiple warehouses. Two front-end surfaces share one NestJS backend and data model.

- **Staff App** (`:5000`) — floor ops: receive, dispatch, count, transfer, scan; for `STAFF` + `WAREHOUSE_MANAGER`.
- **Admin Portal** (`:5001`) — config, oversight, approvals, reporting; for `SUPER_ADMIN` + `WAREHOUSE_MANAGER`.

> Authorization is **two layers, both server-side**: **role** (what kind of action) **+** **warehouse scope** (whose data). UI gating is convenience only.

See [`docs/PRD.md`](docs/PRD.md) for the full spec, [`docs/ROADMAP.md`](docs/ROADMAP.md) for build status, and [`CLAUDE.md`](CLAUDE.md) for the engineering contract.

## Tech stack

| Layer | Choice | | Layer | Choice |
|---|---|---|---|---|
| Frontend | Next.js (App Router) + Tailwind + shadcn/ui | | Database | PostgreSQL (+ pgvector for AI) |
| Backend | NestJS | | Auth | JWT (access + refresh), argon2 hashing |
| ORM | Prisma (v6) | | AI | LangChain over OpenAI/Gemini |
| API contract | Swagger → Orval generated client | | Storage | MinIO (local) / S3 (prod) — *deferred* |

Monorepo via **npm workspaces**: two Next.js apps (`apps/staff`, `apps/admin`) and one NestJS API (`apps/api`), with shared infra in `packages/*` (`@iws/ui`, `@iws/api-client`, `@iws/auth`).

## Core features

- **Inventory** per `(Product/Variant × Warehouse)` across four buckets — `available · reserved · damaged · inTransit`.
- **Audit trail** — every quantity change writes a `StockMovement` in the same transaction; all meaningful actions write an `ActivityLog`. Both ledgers are append-only.
- **Procurement** — purchase orders (`Draft → Sent → Approved → Partially Received → Completed`) + goods receiving.
- **Stock operations** — transfers (`Request → Approve → Receive`) and stock counts (variance → adjustment).
- **Catalog** — warehouses, categories, products & variants (own SKU/barcode), barcode/QR generation.
- **Insights** — reports + export, dashboard, notifications.
- **AI (drafts/suggestions only)** — forecasting, reorder assistant, chat (RAG over inventory), report summarizer, PO generator. AI never acts autonomously; a human approves every output.

## Prerequisites

- **Node 20+** and **npm**.
- **PostgreSQL 16** running natively on the local machine (no Docker). The `pgvector` extension must be available for the AI features.

## Local setup

1. **Create the dev database/role** (as a Postgres superuser):
   ```sql
   CREATE ROLE iws WITH LOGIN PASSWORD 'iws_password' SUPERUSER;
   CREATE DATABASE iws OWNER iws;
   CREATE EXTENSION IF NOT EXISTS vector;   -- run inside the iws database
   ```
2. **Configure env:**
   ```bash
   cp apps/api/.env.example apps/api/.env
   # staff/admin run with sane dev defaults; copy their .env.example only to override
   ```
   Set `JWT_ACCESS_SECRET` / `JWT_REFRESH_SECRET` to real values. Secrets are env-only and never committed.
3. **Install + migrate + seed:**
   ```bash
   npm install
   npm run db:migrate
   npm run db:seed -w api    # seeds roles + initial admin user
   ```
4. **Run** (separate terminals):
   ```bash
   npm run dev:api      # NestJS  → http://localhost:5002/api/v1
   npm run dev:staff    # Staff   → http://localhost:5000
   npm run dev:admin    # Admin   → http://localhost:5001
   ```

> **Ports:** API `:5002`, Staff `:5000`, Admin `:5001`. The web apps auto-target the API on `:5002`; set `NEXT_PUBLIC_API_URL` only for prod/remote.

## Useful commands

| Action | Command |
|---|---|
| API dev (→ `:5002/api/v1`) | `npm run dev:api` |
| Staff dev (→ `:5000`) | `npm run dev:staff` |
| Admin dev (→ `:5001`) | `npm run dev:admin` |
| Migrate (dev) / deploy (prod) | `npm run db:migrate` / `npm run db:deploy` |
| Re-seed dev data | `npm run db:seed -w api` |
| Prisma Studio | `npm run db:studio` |
| Typecheck / lint / build (all workspaces) | `npm run typecheck` / `npm run lint` / `npm run build` |
| Unit tests / API e2e (serial) | `npm test` / `npm run test:e2e` |
| Swagger UI | open `http://localhost:5002/api/v1/docs` (run `npm run dev:api`) |
| Regenerate OpenAPI spec / client / both | `npm run api:openapi` / `npm run api:client` / `npm run api:gen` |
| Full QA gate (typecheck → lint → test → build → e2e) | `npm run qa:gate` |

## Project structure

```
apps/
  api      NestJS API — one module per domain (auth, users, warehouses, products,
           inventory, suppliers, purchase-orders, transfers, stock-counts,
           movements, reports, ai, notifications); controller → service → repository
  staff    Next.js Staff App  (:5000)
  admin    Next.js Admin Portal (:5001)
packages/
  ui          @iws/ui          design tokens + shared shadcn/ui components
  api-client  @iws/api-client  Orval-generated client + axios mutator + token store
  auth        @iws/auth        AuthProvider / useRequireAuth
docs/
  PRD.md       full spec (source of truth)
  ROADMAP.md   build status dashboard
  phases/      milestone specs + per-phase progress logs
  plans/       dated implementation plans
  qa/          per-flow QA reports
  design/      design system + wireframe
```

## API contract flow

The frontend talks to the API **only** through the Orval-generated client — no hand-written `fetch`/`axios` in app code. To add or change an endpoint:

1. Annotate the NestJS controller/DTO with Swagger decorators.
2. `npm run api:gen` — regenerates `apps/api/openapi.json` **and** the typed React-Query hooks in `packages/api-client/src/generated`.
3. Consume the regenerated hooks + models from `@iws/api-client`.

`generated/` is rebuilt wholesale (`clean: true`) — never hand-edit it. The only file allowed to import `axios` directly is `packages/api-client/src/axios.ts`.

## Branching, commits & QA gate

- **Branching:** feature work on **`piyush`**; PRs target **`main`**.
- **Commits:** [Conventional Commits](https://www.conventionalcommits.org/) with a workspace scope — `feat(api):`, `fix(web):`, `chore:`, `docs:`. One logical change per commit.
- **QA gate (pre-commit wall):** a Husky `pre-commit` hook runs `npm run qa:gate` — **every commit must pass** typecheck → lint → unit → build → e2e. Genuine no-code commits can escape with `git commit --no-verify` or `QA_GUARD_SKIP=1`.
- **Tests:** unit specs colocated as `*.spec.ts`; API e2e under `apps/api/test` runs **serially**. Every business rule (stock invariants, state-machine transitions, authz scope) gets a test; a bug fix gets its regression test first.

## Security

- **Secrets are env-only.** `.env` files are git-ignored and never committed; validate them at boot. Rotate any secret that is ever exposed.
- **Server-side authz everywhere** — every warehouse-bound query is filtered by scope and gated by role on the server. UI hiding is not security.
- **Append-only ledgers** (`StockMovement`, `ActivityLog`) are never updated or deleted; soft-delete products/warehouses with stock or history.
- **No autonomous AI actions** — AI produces drafts/suggestions only; a human approves before anything is sent or committed.
