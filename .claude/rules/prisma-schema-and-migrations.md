---
paths:
  - "**/prisma/**"
  - "**/*.prisma"
---

# Prisma Schema & Migrations

How the data model changes safely. Schema lives at `apps/api/prisma/schema.prisma`; migrations under `apps/api/prisma/migrations/`. Local Postgres (no Docker); `pgvector` enabled.

## Migration flow

- Schema change → `npm run db:migrate` (creates + applies a dev migration). Never edit `schema.prisma` and skip the migration.
- **Never hand-edit an already-applied migration** or the generated Prisma client — history must match what ran. Need a change? Make a new migration.
- Commit `schema.prisma` **and** its generated migration together, in the same change.
- `npm run db:deploy` applies migrations in non-dev; `npm run db:generate` regenerates the client.

## Types & naming

- **Money/qty are never `Float`.** Use `Int` (minor units) or `Decimal`. A `Float` on a money/quantity column is a bug.
- DB is `snake_case`: every model field maps via `@map`, every model/enum via `@@map`. Code stays `camelCase`/`PascalCase`.
- **Soft-delete** anything with stock or history (products, warehouses): a nullable `deletedAt` (or status enum), never a hard `DELETE`. Default queries exclude soft-deleted rows.

## Integrity & performance

- `InventoryItem` is unique per (Product-or-Variant × Warehouse) — enforce with a `@@unique`.
- Index the hot paths: inventory + movements by `(product, warehouse, date)`. Paginate movement/report queries — never unbounded `findMany`.
- `StockMovement` and `ActivityLog` are append-only at the DB level too — no schema affordance for updating/deleting ledger rows (see the **stock-invariants-and-ledgers** skill).

## Checklist before claiming a schema/migration task done

- [ ] Change went through `npm run db:migrate`; no applied migration was edited by hand.
- [ ] `schema.prisma` + migration committed together.
- [ ] No `Float` on money/quantity fields (`Int`/`Decimal` only).
- [ ] `@map`/`@@map` present so DB is `snake_case`.
- [ ] Soft-delete field instead of hard delete where stock/history exists.
- [ ] Required `@@unique` / indexes added for new lookups; large reads paginated.
