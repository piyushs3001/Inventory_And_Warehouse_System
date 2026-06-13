# QA — Warehouse Scope Enforcement Layer

**Date:** 2026-06-13 · **Flow/Task:** Pre-Phase-2 remediation — build the reusable two-layer-authz **warehouse-scope** enforcement primitives that Phase 1 marked done but never built (role gate existed; scope filter did not). Backend-only.

## What was built
A reusable, fail-closed scope layer in `apps/api/src/auth/`:
- `WarehouseScope` type + `RequestWithScope` (`auth.types.ts`) — discriminated union: `{isGlobal:true}` (Super Admin) | `{isGlobal:false, warehouseIds[]}`.
- `ScopeService.resolve(user)` (`scope.service.ts`) — resolves scope from the JWT principal (never client input); Super Admin → global; every other role → assigned ids via the existing `UsersService.getWarehouseScope`.
- Pure helpers (`scope.helpers.ts`) — `warehouseFilter(scope, field?)` (Prisma `where` fragment) + `assertWarehouseInScope(scope, id)` (throws 403).
- `ScopeGuard` (`guards/scope.guard.ts`) — resolves + attaches `req.warehouseScope`; runs after `JwtAccessGuard`.
- `@CurrentScope()` (`decorators/current-scope.decorator.ts`) — injects the resolved scope; throws if absent.
- Wired into `AuthModule` (provided + exported) for Phase 2 domain modules to import.

## QA method
**Browser (Playwright MCP) QA: Not Applicable for this change.** No HTTP endpoint consumes the layer yet and there is no UI surface — there is no end-to-end flow to drive in a browser. Verification is by automated **unit** tests (positive + negative/fail-closed) plus the **e2e bootstrap** (confirms the full app, with the new providers, still starts and existing flows pass). The first browser-QA-able behaviour arrives with **Phase 2's first scoped endpoint** (e.g. a Manager/Staff caller receiving only in-scope rows, and an out-of-scope caller being rejected); that negative-path browser + e2e QA is deferred to that task.

## Scenarios & results

| # | Scenario (▲ positive / ▼ negative) | Result |
|---|---|---|
| 1 | ▲ Global (Super Admin) scope → `warehouseFilter` returns `{}` (no restriction) | **Passed** |
| 2 | ▲ Scoped caller → `warehouseFilter` returns `{ warehouseId: { in: [...] } }` | **Passed** |
| 3 | ▼ Empty scope → `warehouseFilter` returns `{ warehouseId: { in: [] } }` (matches nothing, fail-closed) | **Passed** |
| 4 | ▲ Custom field name supported (e.g. `sourceWarehouseId`) | **Passed** |
| 5 | ▲ `assertWarehouseInScope` allows any warehouse for global scope | **Passed** |
| 6 | ▲ `assertWarehouseInScope` allows a warehouse inside the scoped set | **Passed** |
| 7 | ▼ `assertWarehouseInScope` forbids (403) a warehouse outside the set | **Passed** |
| 8 | ▼ `assertWarehouseInScope` fails closed (403) for an empty scope | **Passed** |
| 9 | ▲ `ScopeService.resolve` — Super Admin → global, no assignment query | **Passed** |
| 10 | ▲ `ScopeService.resolve` — Manager/Staff → assigned ids (queried by `sub`) | **Passed** |
| 11 | ▼ `ScopeService.resolve` — Supplier / unassigned → empty fail-closed scope | **Passed** |
| 12 | ▲ `ScopeGuard` resolves and attaches `req.warehouseScope`, returns true | **Passed** |
| 13 | ▼ `ScopeGuard` fails closed (403) when no authenticated principal present | **Passed** |
| 14 | ▲ `@CurrentScope()` returns the scope attached by the guard | **Passed** |
| 15 | ▼ `@CurrentScope()` fails closed (403) when guard was not applied | **Passed** |
| 16 | ▲ Full app bootstraps with new providers; all existing e2e pass | **Passed** (13/13 e2e) |

## Build gate
typecheck ✓ · lint ✓ · unit **32/32** (16 new) ✓ · build ✓ · e2e **13/13** ✓

## Bugs found / fixed
None. No defects surfaced in the audit or test runs.

## Not covered / deferred
- **End-to-end scope rejection through a real endpoint** (wrong-scope caller → 403/empty; in-scope caller → only their rows) — deferred to **Phase 2's first warehouse-bound endpoint**, where it will get an e2e + browser-QA pass.
- Per-request scope **caching** — deferred (YAGNI) until perf warrants.
- **Supplier PO-ownership** gating — separate concern, Phase 4 (Suppliers/POs). The layer correctly resolves a Supplier to an empty warehouse scope (fail-closed) rather than mis-routing them through warehouse logic.
- **JWT-embedded scope** — explicitly rejected in design (favoured fresh per-request resolution).
