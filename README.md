# Inventory & Warehouse System

Staff-facing web/mobile app + admin portal for inventory, warehouses, suppliers, stock movements, purchase orders, reporting, and AI. See `docs/PRD.md` for the full spec and `docs/phases/` for the phased build plan.

## Stack
Next.js (App Router) + Tailwind + shadcn/ui · NestJS + Prisma (v6) · PostgreSQL · JWT auth.
_Deferred to later phases: pgvector (AI), MinIO/S3 object storage (file uploads)._

## Local setup
1. Install **Node 20+** and **PostgreSQL 16**.
2. Create the dev database/role (as a Postgres superuser):
   ```sql
   CREATE ROLE iws WITH LOGIN PASSWORD 'iws_password' SUPERUSER;
   CREATE DATABASE iws OWNER iws;
   ```
3. `cp apps/api/.env.example apps/api/.env`
4. `npm install`
5. `npm run db:migrate`
6. `npm run dev:api` and `npm run dev:web` (separate terminals).

## Useful commands
| Action | Command |
|---|---|
| API dev (→ /api/v1/health) | `npm run dev:api` |
| Web dev | `npm run dev:web` |
| Migrate (dev) | `npm run db:migrate` |
| Prisma Studio | `npm run db:studio` |
| Typecheck / lint / build | `npm run typecheck` / `npm run lint` / `npm run build` |
| Unit tests / e2e | `npm test` / `npm run test:e2e` |
| Swagger UI | open `http://localhost:3001/api/v1/docs` (run `npm run dev:api`) |
| Regenerate OpenAPI spec | `npm run api:openapi` |
| Regenerate API client | `npm run web:client` |
| Regenerate spec + client | `npm run api:gen` |

## Layout
```
apps/api   NestJS API (Prisma, modules per domain)
apps/web   Next.js app ((staff)/(admin) route groups planned)
docs/      PRD, phase plans, implementation plans
```
