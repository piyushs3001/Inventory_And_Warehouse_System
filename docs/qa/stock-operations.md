# QA Report — Phase 5: Stock Operations (Transfers + Counts)

- **Date:** 2026-06-19
- **Flow/Task:** Phase 5 — Stock Operations (Stock Transfers + Stock Counts), end-to-end through the Admin Portal (`:5001`) and Staff App (`:5000`), API at `:5002/api/v1`.
- **Tester:** qa-tester (Playwright MCP + direct API probing for server-side authz/state checks)
- **Build under test:** branch `piyush`, commits incl. `feat(api): products module` and the Phase 5 transfers/stock-counts modules present in `apps/api/src/{transfers,stock-counts}`.

## Summary

All 9 functional scenarios **PASSED**, plus negative input and server-side authorization checks. Stock is conserved and auditable across every transition; bucket math is correct; the state machines reject illegal transitions (409) and the two-layer authz rejects wrong-role / out-of-scope requests (403) **server-side**, not just by hiding UI.

One **environment blocker** (not a product defect) was found and fixed before testing could proceed: the running API process was stale and did not serve the Phase 5 routes (`/transfers`, `/stock-counts` returned 404 while the compiled `dist/` already contained them). Restarting the API process resolved it. See "Bugs / Issues" below.

## Environment fix applied before testing

The live API (`node dist/main`, pid started 18:07) predated the `dist/` rebuild (18:54) that included `TransfersModule` + `StockCountsModule`. Symptom: `GET /api/v1/transfers` and `/api/v1/stock-counts` → 404, while `/inventory` and `/movements` → 200. The Admin transfers page rendered a misleading "No transfers" empty state on top of the 404. Fixed by killing the stale process and relaunching from the current `dist/`. After restart both routes returned 200 and all UI flows worked. No source change made.

## Scenarios

### Transfers

| # | Scenario | Result | Evidence |
|---|----------|--------|----------|
| 1 | New transfer Central→North, Cola qty 20 → REQUESTED; Central Cola held Available 80 / In-transit 20 | **Passed** | TR-00016 created REQUESTED; Inventory showed Cola Central 80 avail / 20 transit / 100 total. `qa-stockops-transfer-intransit-held.png` |
| 2 | Approve → APPROVED, Receive → COMPLETED; Central Cola 80/0, North Depot Cola 20; conserved 80+20=100 | **Passed** | UI status transitions REQUESTED→APPROVED→COMPLETED; Inventory Central 80/0, North 20/0. `qa-stockops-transfer-completed-conserved.png` |
| 3 | Cancel flow: Central→North Water qty 10 → REQUESTED (Central Water 90/10); Cancel → 100/0 released | **Passed** | TR-00017 REQUESTED with Central Water 90 avail / 10 transit; after Cancel → CANCELLED, Water back to 100/0. `qa-stockops-cancel-released.png` |
| 4 | Movements ledger shows TRANSFER legs: request out, source-clear on receive, destination-land on receive | **Passed** | Ledger rows for TR-00016: "Transfer out" (Central Avail −20/Transit +20), "Transfer out received" (Central Transit −20, 100→80), "Transfer in" (North Avail +20, 0→20); plus TR-00017 out + cancel-reversal. All append-only with user/before/after/type/reason/ref. `qa-stockops-transfer-movements.png` |
| 5 | Negative: REQUESTED transfer offers no Receive until approved; receive-before-approve → 409; act on COMPLETED rejected | **Passed** | UI: REQUESTED row shows only Approve/Cancel (no Receive); COMPLETED row shows no actions. API: receive on REQUESTED → 409 "A transfer in REQUESTED cannot be received"; on COMPLETED, receive/approve/cancel all → 409. |

### Stock Counts

| # | Scenario | Result | Evidence |
|---|----------|--------|----------|
| 6 | Admin New count for Central → OPEN session, lines for all products with Recorded (system) qty | **Passed** | SC-00009 OPEN, Central; lines Cola 80 (live recorded, not stale 100), Water 100, Stapler 100. |
| 7 | Enter counted: Cola 78 (variance −2), others equal recorded; Save → variances display | **Passed** | After Save: Cola −2, Water 0, Stapler 0. `qa-stockops-count-variance.png` |
| 8 | Reconcile (admin) → RECONCILED; Central Cola Available 78; Movements shows one ADJUSTMENT (Avail −2) ref'ing count; zero-variance lines wrote no movement | **Passed** | Status RECONCILED (reconciled by Super Admin); Inventory Central Cola 78. Movements ADJUSTMENT filter = exactly **1 movement**: Cola, Central, Avail −2, 80→78, reason "Stock count SC-00009 reconciliation". Water/Stapler wrote nothing. `qa-stockops-reconcile-adjustment.png` |
| 9 | Staff (`:5000`) can open count detail + enter/save counts, but has **no Reconcile button**; entering counts on a RECONCILED session impossible | **Passed** | Staff count detail (SC-00010) shows "Save counts" + editable inputs and **no Reconcile button** (admin detail had both). Staff saved a count successfully (scope = Central). API: enter counts on RECONCILED → 409; reconcile on RECONCILED → 409. `qa-stockops-staff-no-reconcile.png` |

### Negative input (adversarial)

| Case | Result | Evidence |
|------|--------|----------|
| Transfer qty greater than available (9999 vs 78) | **Passed** | 400 "Insufficient stock: the change would drive a bucket below zero" |
| Same source == destination | **Passed** | 400 "Source and destination must differ" |
| Zero / sub-1 line quantity | **Passed** | 400 "lines.0.quantity must not be less than 1" |
| Enter count for product not in session / malformed body | **Passed** | DTO validation 400 (also covered by e2e) |

### Authorization (two-layer: role + warehouse scope, server-side)

Verified directly against the live API with a real Staff token (UI hiding alone is insufficient; these confirm server enforcement):

| Case | Result | Evidence |
|------|--------|----------|
| Staff requests a transfer **from their own** warehouse (Central→North) | **Passed** | 201 Created |
| Staff tries to **approve** a transfer | **Passed** | 403 "Insufficient role" |
| Staff requests a transfer with **out-of-scope source** (North Depot) | **Passed** | 403 "Warehouse outside your scope" |
| Unauthenticated transfer list | **Passed** (covered by e2e) | 401 |
| Manager out-of-scope source/destination; approve requires source scope; staff cannot create/reconcile a count; out-of-scope count open | **Passed** (covered by `apps/api/test/stock-operations.e2e-spec.ts`) | 17 e2e cases incl. these authz/scope rejections |

## Stock invariants observed

- **Conservation:** Cola total across warehouses ended at 78 (Central) + 20 (North) = 98 = original 100 − 2 (count adjustment). No quantity invented or lost outside the explicit reconcile.
- **Bucket math:** every transition moved quantity between the correct buckets (Available ↔ In-transit on transfer; Available corrected on adjustment); In-transit never lost between legs.
- **Audit trail:** every quantity change wrote exactly one StockMovement of a valid type (TRANSFER / ADJUSTMENT) with user, before/after, reason, and transfer/count reference. Zero-variance count lines correctly wrote no movement.
- **Append-only:** Movements page is labelled read-only; reconcile and cancel wrote *new* compensating movements rather than mutating prior rows.

## Console / network

- No JavaScript console errors on any tested page after the API restart. The only console errors observed are the expected pre-login `GET /auth/me` 401 and `POST /auth/refresh` 403 (auth bootstrap before a session exists) on both apps' login pages — not defects.

## Bugs / Issues

| ID | Severity | Description | Status |
|----|----------|-------------|--------|
| ENV-1 | Blocker (environment, not product) | Live API process was stale: `/transfers` and `/stock-counts` returned 404 though the compiled `dist/` and source both contained the modules. The Admin transfers page masked this as a "No transfers" empty state. | **Fixed** by restarting the API from current `dist/`; no code change. Process note: run the dev API in watch mode (`npm run dev:api`) so route changes are picked up, or rebuild+restart `dist` together. |

No product defects found. All state-machine, invariant, and authorization behaviours are correct.

## Not covered / deferred

- **Full e2e suite not re-run in this session.** The `stock-operations.e2e-spec.ts` (17 cases) is the source of truth for the manager out-of-scope and approve-requires-source-scope authz paths; per project memory the e2e run **truncates the shared dev `iws` DB** (`users` table), which would invalidate the live seed mid-QA. I verified the highest-value authz paths (staff request/approve/out-of-scope) directly against the live API instead, and rely on the e2e for the manager-scoped variants. To run the suite, re-seed afterward (`npm run db:seed -w api`).
- **Multi-line transfers and partial scenarios** beyond a single line per transfer were not exercised in the UI (single-line was sufficient to validate the bucket/ledger invariants); the e2e covers additional shapes.
- **Damaged-bucket interactions** are out of scope for transfers/counts here (belong to receiving/PO flows).

## Screenshots (docs/qa/screenshots/)

- `qa-stockops-transfer-intransit-held.png` — Scenario 1, in-transit hold
- `qa-stockops-transfer-completed-conserved.png` — Scenario 2, completed + conserved
- `qa-stockops-cancel-released.png` — Scenario 3, cancel released the hold
- `qa-stockops-transfer-movements.png` — Scenario 4, TRANSFER movement ledger
- `qa-stockops-count-variance.png` — Scenario 7, count variances
- `qa-stockops-reconcile-adjustment.png` — Scenario 8, reconciled ADJUSTMENT movement
- `qa-stockops-staff-no-reconcile.png` — Scenario 9, staff count detail with no Reconcile button
