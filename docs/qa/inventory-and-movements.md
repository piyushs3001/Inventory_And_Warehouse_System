# QA Report — Phase 3: Inventory + Movements

- **Flow / task:** Phase 3 — Inventory + Movements (admin Adjust/Reserve, four-bucket stock, low-stock badge, append-only movement ledger + filters; staff scoped read-only inventory + reserve + movement history)
- **Date:** 2026-06-19
- **Tester:** qa-tester (Playwright MCP, real browser flows)
- **Surfaces:** Admin Portal `http://localhost:5001`, Staff App `http://localhost:5000`, API `http://localhost:5002/api/v1`
- **Test users:** Super Admin `admin@iws.local` (global scope); Staff `staff@iws.local` (role STAFF, scope = Central Warehouse only — confirmed via `/auth/me`)
- **Seed:** Cola 330ml Can (COLA-330, reorder 50), Spring Water 1L (WATER-1L, reorder 100), Stapler Heavy Duty (STAP-HD, reorder 10); warehouses Central Warehouse + North Depot; no inventory rows at start.

## Result summary

| # | Scenario | Result |
|---|----------|--------|
| 1 | Admin adjust — create Cola/Central/Available +120 "Opening stock" | **Passed** |
| 2 | Admin adjust — Cola Damaged +3 "Breakage" | **Passed** |
| 3 | Admin reserve — Cola qty 20 "SO-1" (total conserved) | **Passed** |
| 4 | Admin adjust — Stapler Available 5 → Low badge | **Passed** |
| 5 | Admin Movements ledger + Type & Product filters | **Passed** |
| 6 | Negative — adjust with empty Reason blocked, no stock change | **Passed** |
| 7 | Negative — adjust delta -99999 → 400 Insufficient stock, no change | **Passed** |
| 8 | Negative — reserve qty > available blocked | **Passed** |
| 9 | Staff View Inventory — scope-limited (Central only), buckets, low badge | **Passed** |
| 10 | Staff reserve — small qty succeeds, available↓ / reserved↑ | **Passed** |
| 11 | Staff Movement History — scoped, read-only, Type filter | **Passed** |
| 12 | Staff has NO Adjust button (header or per-row) | **Passed** |
| 13 | Staff cannot adjust server-side (403) | **Passed** |
| + | Extra adversarial — staff scope enforcement (reserve + list) | **Passed** |

**Totals: 13/13 scenarios Passed (+1 extra adversarial check Passed). 0 Failed, 0 Blocked, 0 Skipped. No bugs found.**

---

## Detail

### Admin — positive

**1. Adjust create (Cola / Central / Available +120).** From empty state, "Adjust stock" → Cola, Central Warehouse, bucket Available, delta 120, reason "Opening stock", Apply. Row appeared: Available **120**, Reserved 0, Damaged 0, In transit 0, Total **120**, no Low badge (120 > reorder 50). **Passed.**

**2. Adjust Damaged (+3).** Per-row Adjust on Cola (Product/Warehouse locked & disabled, as designed) → bucket Damaged, delta 3, reason "Breakage". Result: Available 120, Damaged **3**, Total **123**. **Passed.**

**3. Reserve (qty 20).** Per-row Reserve on Cola → quantity 20, note "SO-1". Result: Available **100**, Reserved **20**, Damaged 3, Total **123** — total unchanged by the reservation (Available→Reserved move, no quantity created/destroyed). **Passed.** Screenshot: `screenshots/qa-inventory-admin-buckets.png`.

**4. Low-stock badge (Stapler).** "Adjust stock" (free selection) → Stapler, Central, Available +5, "Opening stock". Row shows a **Low** badge next to Available **5** (5 ≤ reorder 10). **Passed.** Screenshot: `screenshots/qa-inventory-low-stock.png`.

**5. Movements ledger + filters.** `/movements` listed all four ADJUSTMENT entries newest-first, each with correct before/after **totals**, delta summary, reason text, and **Super Admin** as actor:
- Stapler `Avail +5` 0→5 "Opening stock"
- Cola `Avail -20, Resv +20` 123→123 "Reservation: SO-1"
- Cola `Dmg +3` 120→123 "Breakage"
- Cola `Avail +120` 0→120 "Opening stock"

The reserve movement correctly records before=after=123 (total conserved). Filters verified both directions: **Type=ADJUSTMENT → 4 rows**, **Type=RECEIVE → 0 rows + empty state**; **Product=Cola → exactly 3 rows (all Cola)**. **Passed.** Screenshot: `screenshots/qa-inventory-movements-ledger.png`.

### Admin — negative

**6. Empty reason blocked.** Adjust Cola, delta 10, Reason left empty, Apply → submit blocked by required-field validation ("Please fill in this field."), dialog stayed open, **no `POST /inventory/adjust` fired**, stock unchanged. **Passed.**

**7. Insufficient stock (delta -99999).** Adjust Cola, Available, delta -99999, reason "x", Apply → server **`POST /inventory/adjust` → 400**, dialog shows *"Insufficient stock: the change would drive a bucket below zero"*, row unchanged (still 100 / 20 / 3 / 0 / 123) — transaction rolled back. **Passed.** Screenshot: `screenshots/qa-inventory-insufficient-stock-error.png`.

**8. Reserve over-available.** Reserve on Cola (100 available), quantity 999, submit → blocked; the qty input is `max=100` and reports "Value must be less than or equal to 100.", **no `POST /inventory/reserve` fired**, dialog stayed open, stock unchanged. (Backed by a JS guard "Only N available to reserve" and server fail-closed `applyMovement`.) **Passed.**

### Staff (`:5000`, scope = Central Warehouse)

**9. Scoped View Inventory.** Lists only Central Warehouse rows (Cola, Stapler). Warehouse filter dropdown contains only "All my warehouses" + "Central Warehouse" — **North Depot never appears**. Buckets render; Stapler shows the Low badge. **Passed.** Screenshot: `screenshots/qa-inventory-staff-scoped-view.png`.

**10. Staff reserve.** Reserve 2 on Stapler (5 available) → `POST /inventory/reserve` **200 OK**. Stapler now Available **3** (still Low), Reserved **2**, Total 5 (conserved). **Passed.**

**11. Staff Movement History.** Read-only ledger, scoped to Central, showing 5 movements (the 4 admin entries + the staff's own Stapler reservation `Avail -2, Resv +2` 5→5). Type filter verified: **ADJUSTMENT → 5**, **TRANSFER → 0 + empty state**. **Passed.** *(Design note, not a defect: the staff Movement History omits the "By"/actor column present in the admin view — appropriate, actor identity is an admin/audit concern.)*

**12. No Adjust affordance for staff.** Staff View Inventory has **no header "Adjust stock" button** and **no per-row "Adjust" button** — only a per-row "Reserve". UI gating correct. **Passed.**

**13. Server-side role gating.** Direct API call with the staff token:
- `POST /inventory/adjust` (Central, in scope) → **403 "Insufficient role"**.
- `POST /inventory/adjust` (North Depot, out of scope) → **403 "Insufficient role"** (role checked before scope).

UI hiding is backed by real server enforcement. **Passed.**

### Extra adversarial — scope layer (beyond the brief)
With the staff token:
- `POST /inventory/reserve` into **North Depot** (role allows reserve, but warehouse out of scope) → **403 "Warehouse outside your scope"** — scope layer enforced independently of role.
- `GET /inventory?warehouseId=<North Depot>` → **total 0, 0 rows** — no out-of-scope leak, fail-closed.

Confirms two-layer authz (role AND scope), both server-side. **Passed.**

---

## Invariants observed to hold
- **Audit trail:** every quantity change produced exactly one matching `StockMovement` (adjust + reserve both write ADJUSTMENT rows with before/after totals, reason, actor).
- **Bucket conservation:** Reserve moved Available→Reserved with total unchanged (123→123, 5→5); Damaged adjust increased total via an explicit signed delta.
- **Fail-closed:** a delta driving a bucket below zero is refused with 400 and the whole change rolls back (row unchanged).
- **Two-layer authz:** role (adjust = manager/admin only → 403 for staff) and scope (out-of-scope warehouse → 403 / no rows) both enforced server-side.

## Console / network health
No unexpected client-side runtime errors across the session. The only console error observed was the **expected 400** from Scenario 7 (`/inventory/adjust`). All other API calls returned 200.

## Not covered / deferred
- **`StockMovement` ↔ `ActivityLog` dual-write** for adjustments was not inspected at the DB level here (the Movements UI does not surface ActivityLog). Recommend a unit/e2e assertion that an ActivityLog row is written alongside the StockMovement for adjust/reserve. *(Pending — verify in invariant review / e2e, not via browser.)*
- **Transaction-rollback atomicity** (movement + item commit/rollback together) is asserted by `apps/api/test/inventory.e2e-spec.ts`; not re-driven through the browser.
- **Pagination beyond one page** not exercised (only 2 inventory rows / 5 movements in scope) — deferred, low risk.
- **Spring Water (WATER-1L)** product was left with no inventory row (not required by the scenarios).
