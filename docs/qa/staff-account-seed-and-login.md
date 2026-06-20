# QA — Staff account seed & staff-app login

- **Date:** 2026-06-19
- **Flow / task:** Seed a ready-to-use `STAFF` account (`apps/api/prisma/seed-staff.ts`) and verify it logs into the Staff app (`:5000`); confirm auth gating still rejects bad credentials and wrong-role accounts.
- **Surfaces:** Staff App (`http://localhost:5000`), API (`http://localhost:5002/api/v1`).
- **Tooling:** Playwright MCP (browser-driven), plus direct API/DB checks.

## Change under test

Added `apps/api/prisma/seed-staff.ts` — an idempotent upsert that creates `staff@iws.local`
(role `STAFF`, status `ACTIVE`, scoped to **Central Warehouse**), bcrypt-hashed like the base seed.
Email/password overridable via `SEED_STAFF_EMAIL` / `SEED_STAFF_PASSWORD`. No application/runtime
source changed — this is a dev/seed utility only.

## Pre-checks

| Check | Result |
|---|---|
| `tsc --noEmit` on `seed-staff.ts` | Passed (no errors) |
| Seed run creates row | Passed — `Seeded STAFF <staff@iws.local> scoped to "Central Warehouse"` |
| DB row: role/status/scope | Passed — `STAFF` / `ACTIVE` / scope=`Central Warehouse` |
| API `POST /auth/login` (valid) | Passed — 200 + JWT with `role: STAFF` |

## Scenarios

| # | Type | Scenario | Expected | Result |
|---|---|---|---|---|
| 1 | Positive | Login `staff@iws.local` / `Staff@12345` on Staff app | Lands on `/home`, sidebar shows "Floor Staff / Staff" | **Passed** |
| 2 | Negative | Login `staff@iws.local` / `WrongPass123` | Stays on `/login`, generic "Invalid credentials" (no user-enumeration) | **Passed** |
| 3 | Negative | Wrong-role: `admin@iws.local` (SUPER_ADMIN) on Staff app | Rejected in place: "This account doesn't have access to the Staff app." + link to Admin Portal (`:5001`); never reaches `/home` | **Passed** |

## Notes / observations

- Browser console logged a 401 network error on scenarios 2 & 3 — that is the **expected** rejected
  login response surfaced by the fetch layer, not a UI defect. UI handled it gracefully (inline alert).
- Scenario 3 confirms UI role-gating is in place; per `CLAUDE.md`, server-side role + scope authz is the
  real boundary and is unchanged by this task.

## Coverage / deferred

- **Not retested here:** server-side scope filtering on staff data endpoints (covered by
  `warehouse-scope-enforcement-layer.md`); self-registration pending-approval path (covered by
  `self-registration.md`). This task only added a seed user and re-verified the login gate.
- **Heads-up:** API e2e truncates the shared `iws` `users` table; re-run `npx ts-node prisma/seed-staff.ts`
  (and the base seed) afterward to restore these logins.

## Verdict

All scenarios **Passed**. No bugs found. No open defects.
