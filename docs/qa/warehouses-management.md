# QA — Warehouses Management (Phase 2, Slice 1)

**Date:** 2026-06-13 (build) · 2026-06-19 (browser QA) · **Branch/worktree:** `phase-2-catalog-warehouses` / `piyush` · **Flow:** Warehouses CRUD API + `/warehouses` admin UI, with two-layer authorization (role + warehouse scope). First real consumer of the `ScopeGuard`/`warehouseFilter` layer.

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

## Browser QA — Playwright MCP (2026-06-19)

**Flow/task:** Phase 2 Slice 1 — Warehouse Management browser QA. **Surface:** Admin Portal `http://localhost:5001`, warehouses page served at **`/warehouses`** (the `(admin)` route group adds no URL segment — the slice's earlier `/admin/warehouses` URL is wrong; `/admin/warehouses` 404s). **API:** `http://localhost:5002/api/v1`. **User:** `admin@iws.local` (SUPER_ADMIN, global scope). Drove the real flow end-to-end through the browser; verified persisted state via reload + the underlying API calls.

### Positive
| # | Scenario | Result | Evidence |
|---|---|---|---|
| P1 | Super Admin login → lands in admin portal (`/`), not bounced | **Passed** | dashboard + "Warehouses" nav rendered |
| P2 | List `/warehouses` → Central Warehouse + North Depot, both ACTIVE badges | **Passed** | `qa-warehouses-02-list.png` |
| P3 | Create "QA Test Depot" (address/contact/capacity) → `POST` 201, row appears ACTIVE (cap 5000, contact Jane QA) | **Passed** | `qa-warehouses-04-created.png` |
| P4 | Edit → change contact "Bob Edited" + capacity 7500 → `PATCH` 200; **persists after full page reload** | **Passed** | `qa-warehouses-05-edited-persisted.png` |
| P5 | Archive (soft-delete) → confirm prompt → `DELETE` 200 → drops from default list; reappears as **INACTIVE** under "Include archived" (NOT hard-deleted; Archive action correctly hidden on inactive row) | **Passed** | `qa-warehouses-07-archived-inactive.png` |
| P6 | Assign-staff dialog opens scoped to the warehouse, lists candidate users with pre-check checkboxes | **Passed** | `qa-warehouses-06-assign-staff-dialog.png` — only `admin@iws.local` exists (no STAFF seeded), so actual assignment not committed |

### Negative
| # | Scenario | Result | Evidence |
|---|---|---|---|
| N1 | Unauthenticated visit to `/warehouses` → redirected to `/login`, no data. Server-side enforced: direct `GET /api/v1/warehouses` with no token → **401** | **Passed** | `qa-warehouses-01-unauth-redirect.png`; 401 confirmed via in-page fetch |
| N2 | Wrong-role (STAFF) login to admin app → bounced to staff app | **Skipped (covered by unit/e2e)** | No STAFF account seeded; gate verified in code (`page.tsx` `ADMIN_ROLES.includes(role)` → redirect to `STAFF_APP_URL`) + `apps/admin/src/app/login/page.test.tsx` |
| N3 | Create form, empty required Name → submit blocked, no `POST`, dialog stays open | **Passed** | `qa-warehouses-03-validation-empty-name.png`; `name` input `required`, `valueMissing:true`, native message, zero network POST |
| N4 | Out-of-scope warehouse 404 for a scoped Manager | **Skipped (covered by e2e)** | Super Admin has global scope — cannot exercise from this account in the browser; proven by `warehouses-crud.e2e-spec.ts` case #3 |

### Observations (non-blocking)
- **Low — error-envelope mislabel:** the 401 body for an unauthenticated `GET /warehouses` read `"error":"Internal Server Error"` while `statusCode:401` / `message:"Unauthorized"` were correct. Root cause (global filter, not warehouse-specific): `AllExceptionsFilter` defaulted the `error` label to `"Internal Server Error"` and only overrode it when the exception body carried an explicit `error` field — but a guard-thrown bare `UnauthorizedException` has none. **Status: FIXED** (2026-06-19) — the filter now derives the `error` label from the resolved HTTP status when the exception supplies none (`statusLabel(status)`), correcting every guard-thrown 4xx. Regression test added (`all-exceptions.filter.spec.ts`); verified live (`GET /warehouses` no-token → `"error":"Unauthorized"`) and via api unit (64) + e2e (33) green.
- The `(admin)` route group means the canonical URL is `/warehouses`, not `/admin/warehouses` — earlier report text and the task brief both used the wrong path. Worth correcting in nav/docs references.

**Bugs found this pass:** none functional (1 low-severity cosmetic observation above). No regressions; all CRUD + soft-delete + authz behaviours correct both directions.

## Pending / deferred
- **Browser QA is now COMPLETE** (see section above, 2026-06-19). Positive CRUD + archive + assign-staff and negatives N1/N3 driven live; N2 (wrong-role) and N4 (out-of-scope 404) intentionally deferred to unit/e2e as noted (no STAFF user seeded; global-scope account can't exercise scope-404).
- Automated coverage (e2e authz/scope matrix + UI component tests) remains complete and green.
