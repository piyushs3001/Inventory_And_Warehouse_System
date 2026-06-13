# QA — Warehouses Management (Phase 2, Slice 1)

**Date:** 2026-06-13 · **Branch/worktree:** `phase-2-catalog-warehouses` · **Flow:** Warehouses CRUD API + `/admin/warehouses` admin UI, with two-layer authorization (role + warehouse scope). First real consumer of the `ScopeGuard`/`warehouseFilter` layer.

## What was built
- **API:** `Warehouse` gains `address`/`contactPerson`/`capacity`. `warehouses` module → full CRUD: `GET /warehouses` (scope-filtered list, `?includeArchived`), `GET /:id` (scoped, 404 out-of-scope), `POST` / `PATCH /:id` / `DELETE /:id` (soft-archive → `INACTIVE`) / `POST /:id/staff` — **reads any-authed + scope-filtered; writes `@Roles(SUPER_ADMIN)`**. Orval client regenerated.
- **Admin UI:** `/admin/warehouses` table (status/capacity/contact, include-archived toggle), create/edit dialog, archive action, assign-staff dialog (pre-checks current staff). Nav link (SUPER_ADMIN).

## Verification method
This slice's authorization invariant is proven by **e2e** (real HTTP + DB); UI behavior by **vitest component tests**; correctness/quality by two-stage subagent review (invariant-reviewer ✅ + code-reviewer ✅) per task. **Playwright-MCP browser QA is PENDING** — see below.

## Scenarios & results

### API — authz + scope (e2e, `warehouses-crud.e2e-spec.ts`, real Postgres)
| # | Scenario | Result |
|---|---|---|
| 1 | ▲ Super Admin `GET /warehouses` → sees ALL warehouses (global scope) | **Passed** |
| 2 | ▲ Manager `GET /warehouses` → sees ONLY assigned (scope filter) | **Passed** |
| 3 | ▼ Manager `GET /:id` for out-of-scope warehouse → **404** (no existence leak) | **Passed** |
| 4 | ▲ Manager `GET /:id` for in-scope warehouse → 200 | **Passed** |
| 5 | ▼ Manager `POST /warehouses` → **403** (write is Super-Admin-only) | **Passed** |
| 6 | ▼ Staff `POST /:id/staff` → **403** | **Passed** |
| 7 | ▲ Super Admin create → 201; `DELETE` → 200 `INACTIVE`; excluded from default list; present with `?includeArchived=true` | **Passed** |
| 8 | ▲ `POST /:id/staff` assigns staff → that user's scope now includes the warehouse | **Passed** |

### API — service logic (unit, `warehouses.service.spec.ts`)
| Scenario | Result |
|---|---|
| ▲ create maps dto; ▲ global list → no id filter; ▲ scoped list → `{id:{in:[...]}}`; ▼ empty scope → matches nothing; ▲ includeArchived toggles status filter; ▼ findOne out-of-scope → NotFoundException; ▲ archive sets INACTIVE (not delete); ▲ assignStaff uses `set` | **Passed** (18 cases) |

### Admin UI (vitest + RTL)
| # | Scenario | Result |
|---|---|---|
| 9 | ▲ Page renders warehouse rows + status badges from the list hook | **Passed** |
| 10 | ▲ Archive action shown only on ACTIVE rows, not INACTIVE | **Passed** |
| 11 | ▲ Create dialog submits → calls create hook with the form body | **Passed** |
| 12 | ▲ Edit dialog pre-fills + PATCHes | **Passed** |
| 13 | ▲ Assign-staff dialog pre-checks already-assigned users (no silent wipe) and submits `{ userIds: [...] }` | **Passed** |
| 14 | ▲ Nav shows "Warehouses" for SUPER_ADMIN, hides for STAFF | **Passed** |

## Build gate
`npm run qa:gate` green on the final commit: typecheck ✓ · lint ✓ · unit (api 53 / web 37) ✓ · build ✓ · e2e 23 ✓.

## Bugs found & fixed (during review)
- **Silent staff-wipe (correctness, code-review):** assign-staff used Prisma `set` (full replace) but the dialog opened empty → saving would wipe existing staff. **Fixed** — dialog now pre-checks current staff derived from `UserDto.warehouses`. (commit `2113f45`)
- **Contract mismatch (e2e):** `POST /:id/staff` returns 201 (Nest default) but was annotated `@ApiOkResponse`. **Fixed** → `@ApiCreatedResponse`. (commit `873f04b`)
- **Missing negative tests (invariant-review):** no e2e for write-403 / out-of-scope-404. **Fixed** — added in `warehouses-crud.e2e-spec.ts`. (commit `db66ea4`)
- **Misleading/duplicate page test + dead `warehouse-ref.dto.ts`** — repaired / removed.

## Pending / deferred
- **Playwright-MCP browser QA (positive + negative) of `/admin/warehouses` is PENDING.** The Playwright MCP server is approved/connected but its tools are not loaded in the current session (MCP tools register at session start; this session predates the approval). To run: restart the session, launch the web+API dev servers **from this worktree** (the main-checkout dev server doesn't serve worktree code), then drive: Super Admin CRUD + archive + assign-staff (positive); a Staff/Manager user blocked from management actions + an out-of-scope warehouse absent + invalid form rejected (negative). This is the same pending browser-QA gate as Phase 1.5 (`docs/qa/auth-user-management.md`); run them together after the restart.
- Automated coverage (e2e authz/scope matrix + UI component tests) is complete and green in the meantime.
