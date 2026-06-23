---
paths:
  - "apps/api/**/*.controller.ts"
  - "apps/api/**/*.service.ts"
  - "apps/api/**/*.module.ts"
  - "apps/api/**/*.dto.ts"
  - "apps/api/**/dto/**/*.ts"
---

# NestJS API Conventions

How every backend module is built. Full context: `CLAUDE.md` + `docs/PRD.md` §11. Domain rules live in the authz / stock / state-machine skills — this rule is the structural shape.

## Layering (controller → service → repository)

- **Controllers only validate (DTO) and delegate.** They MUST NOT import `PrismaService`, run queries, or hold business logic. A controller touching data = logic in the wrong layer.
- **Services hold business logic** and orchestrate transactions. **Repositories** (or services for simple modules) are the only place Prisma is used.
- One NestJS module per domain (`auth`, `users`, `warehouses`, `products`, `inventory`, …). A growing controller/service means a module doing too much — split it.

## Validation & errors

- Every request body/query/param is a DTO validated with `class-validator` at the controller boundary. Never trust client input for scope/role.
- Throw NestJS `HttpException`s with correct status codes; never leak internals or stack traces. Fail closed.

## Config

- Read env only through `ConfigService` against a schema validated at boot. No raw `process.env` in `apps/api/src` outside `config/`. Missing/invalid env must fail startup, not at runtime.

## Swagger (the web client depends on this)

- Every endpoint is annotated so Orval can generate a typed client:
  - `@ApiTags('<resource>')` on the controller.
  - `@ApiBearerAuth('access-token')` on guarded routes.
  - A **response DTO** class with `@ApiProperty()`, surfaced via `@ApiOkResponse({ type: XxxDto })` — responses do NOT auto-infer (only request bodies do, via the CLI plugin).
- After any endpoint/DTO change, regenerate + commit the contract — see the **api-contract-and-orval-client** rule.

## Checklist before claiming an API task done

- [ ] Controller has no Prisma usage and no business logic — just DTO validation + delegation.
- [ ] Service owns the logic; multi-write operations run in one Prisma transaction.
- [ ] All input is a validated DTO; failures throw proper `HttpException`s, fail-closed.
- [ ] Env read via `ConfigService`, not raw `process.env`.
- [ ] `@ApiTags` + `@ApiBearerAuth` (guarded) + `@ApiOkResponse({ type })` present.
- [ ] `npm run api:gen` run and regenerated spec/client committed.
- [ ] Tests cover the happy path and the rejected (bad input / wrong role) path.
