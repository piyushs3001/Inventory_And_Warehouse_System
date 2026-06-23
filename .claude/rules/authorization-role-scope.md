---
paths:
  - "apps/api/**/*.controller.ts"
  - "apps/api/**/*.service.ts"
  - "apps/api/**/*.guard.ts"
  - "apps/api/**/*.repository.ts"
  - "apps/api/**/*.decorator.ts"
---

# Authorization — Role + Warehouse Scope

Authorization is **two layers, both enforced server-side**. UI hiding is not security. Full context: `CLAUDE.md` + `docs/PRD.md` §3.

## The two layers

1. **Role (what kinds of action):** `Super Admin`, `Warehouse Manager`, `Staff`, `Supplier`.
2. **Warehouse scope (whose data):** the set of warehouses a user is assigned to (M:N `User`↔`Warehouse`).

**Order of enforcement on every warehouse-bound request:** filter the query by the caller's **scope** first, then gate the action by **role**. A user can only ever touch data inside their scope, and only perform actions their role allows on it.

## Role scopes

- **Super Admin** — global; all warehouses, users, permissions, settings, reports.
- **Warehouse Manager** — full control *within assigned warehouses*: stock, POs, transfers, approvals.
- **Staff** — *within assigned warehouses*: receive, dispatch, count, view only.
- **Supplier** — **no warehouse scope**; sees only their own POs, updates delivery status. Never resolve supplier requests through warehouse-scope logic — gate on supplier ownership instead.

## Hard rules

- **Never trust client input for scope or role.** Resolve both from the authenticated principal (JWT → guard), never from request body/query/header.
- **Every warehouse-bound Prisma query is scope-filtered.** A query that can return another warehouse's rows is a security bug, even if the UI never shows them.
- **Authorize in the guard/service, not the controller body.** Controllers only validate DTOs (`class-validator`) and delegate; the guard resolves role + scope per request.
- A missing scope filter must fail **closed** (return nothing / forbid), never open.
- Use NestJS `HttpException`s (`403`/`404`); never leak which warehouses or records exist outside scope.

## Checklist before claiming an endpoint/query task done

- [ ] Caller's role + scope come from the JWT/guard, not the request payload.
- [ ] Every warehouse-bound query is filtered by the caller's assigned warehouses.
- [ ] The action is gated by role (check against the capability, see PRD §3.2 matrix).
- [ ] Supplier access is gated by ownership of the PO, not by warehouse scope.
- [ ] DTO validates all client input at the controller boundary.
- [ ] Failure modes are fail-closed and don't leak out-of-scope existence.
- [ ] A test covers an out-of-scope / wrong-role caller being rejected.
