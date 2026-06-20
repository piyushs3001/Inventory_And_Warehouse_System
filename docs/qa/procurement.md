# QA Report — Phase 4: Procurement (Suppliers, Purchase Orders, Goods Receiving)

- **Date:** 2026-06-19
- **Flow/Task:** Phase 4 — Procurement (Suppliers + Purchase Orders + Goods Receiving), end-to-end via Playwright MCP.
- **Surfaces:** Admin Portal (`:5001`), Staff App (`:5000`), API (`:5002/api/v1`).
- **Test users:** Super Admin `admin@iws.local` (global scope); Staff `staff@iws.local` (scoped to Central Warehouse).
- **Seed:** products COLA-330, WATER-1L, STAP-HD; warehouses Central Warehouse + North Depot.

## Summary

| | Count |
|---|---|
| Passed | 12 |
| Failed | 1 |
| Blocked | 0 |
| Deferred / Not covered | 2 |

One **functional defect** found (BUG-1): the over-receipt guard ignored damaged units, so a PO line could be received with `sound + damaged > ordered`. **Fixed same day (2026-06-19)** — guard now caps cumulative (sound + damaged) at ordered, completion/outstanding made consistent, de-dup added, plus a close-out action for short-ships; covered by 4 new e2e regression tests (suite 81 green). All other scenarios passed.

---

## Scenarios

### Admin — Suppliers (Super Admin)

| # | Scenario | Result | Evidence |
|---|---|---|---|
| 1a | Create supplier "Acme Beverages" (contact, email, phone) → appears in list, ACTIVE | **Passed** | `qa-procurement-supplier-list.png` |
| 1b | Edit supplier — change contact Jane Doe → John Smith, persists in table | **Passed** | snapshot confirmed `John Smith` after Save |
| 1c | Performance with no orders → counts 0, rates show dashes (—) | **Passed** | `qa-procurement-performance-empty.png` |

### Admin — Purchase Orders (Super Admin)

| # | Scenario | Result | Evidence |
|---|---|---|---|
| 2 | New PO: Acme → Central Warehouse, expected 2026-07-15, Cola 100@0.45 + Water 50@0.30. Draft created, code `PO-00001` (matches `PO-#####`), total **60.00** | **Passed** | `qa-procurement-po-draft.png` (list showed `PO-00001 … DRAFT … 2 … 60.00`) |
| 3a | Send → status SENT; Send button gone, Approve/Cancel present | **Passed** | `qa-procurement-po-sent.png` |
| 3b | Approve → status APPROVED; Send/Approve/Cancel all gone (only Back); Created by + Approved by both = Super Admin | **Passed** | `qa-procurement-po-approved.png` |

### Staff — Receiving (Staff)

| # | Scenario | Result | Evidence |
|---|---|---|---|
| 4 | Approved PO appears on staff Receive list; receive Water sound 30 → PO stays **PARTIALLY RECEIVED** (Water 20 outstanding) | **Passed** | `qa-procurement-staff-receive-dialog.png`, `qa-procurement-partially-received.png` |
| 5 | View Inventory: Cola @ Central Warehouse Available **100** (also Damaged 5 — see BUG-1); Water Available 30 | **Passed** | `qa-procurement-inventory-landed.png` |
| 6 | Receive Water sound 20 → PO becomes **COMPLETED**, drops off receivable list ("Nothing to receive") | **Passed** | `qa-procurement-nothing-to-receive.png`, `qa-procurement-po-completed.png` |
| 7a | Negative — over-receipt **sound** > outstanding (Cola sound 150 vs 100). UI: native `max` blocks submit (no network call). API: `POST …/receipts` → **400** "Over-receipt for COLA-330: 150 received exceeds 100 ordered" | **Passed** | API verified; UI input has `max="100"`, `validity.valid=false`, no POST fired |
| 7b | Negative — all-zero quantities. UI shows "Enter received quantities for at least one line" and blocks. API → **400** "A receipt must record at least one unit" | **Passed** | `qa-procurement-allzero-blocked.png` |
| 7c | Negative — **sound + damaged** combined > ordered (Cola sound 100 + damaged 5 = 105 vs ordered 100) → **MUST be rejected** | **FAILED → ✅ FIXED** | Was 201 (BUG-1); now 400, proven by e2e regression test |

### Cross-check (Admin)

| # | Scenario | Result | Evidence |
|---|---|---|---|
| 8 | Movements ledger shows RECEIVE movements for Cola/Water @ Central with correct deltas (Cola "Avail +100, Dmg +5"; Water "Avail +30" then "Avail +20"), before/after correct, by Floor Staff, reason "Goods receipt for PO-00001" | **Passed** | `qa-procurement-movements-ledger.png` |
| 9 | Performance after completion: Total orders 1, Completed 1, Units ordered 150, Units received 150, Units damaged 5, Quantity accuracy 100.0%, Damage rate 3.2%, On-time 100.0% | **Passed** | `qa-procurement-performance-filled.png` |

### Authorization (API-level + UI inspection; also covered by `apps/api/test/procurement.e2e-spec.ts`)

| # | Scenario | Result | Evidence |
|---|---|---|---|
| A1 | Staff app exposes NO Suppliers / Purchase Orders nav | **Passed** | staff sidebar = Home, Receive, Dispatch, Transfers, Count, Catalog, View Inventory, Movement History only |
| A2 | Staff create PO via API → **403** | **Passed** | live `POST /purchase-orders` as staff = 403 |
| A3 | Unauthenticated receive → **401** | **Passed** | live `POST …/receipts` no token = 401 |
| A4 | Receive before approval (Draft) → **409**; approve a Draft (not Sent) → **409**; out-of-scope warehouse receive/create → 403/scoped-out | **Passed** | e2e suite `procurement.e2e-spec.ts` — 11/11 green (verified this run) |

---

## Bugs

### BUG-1 — Over-receipt guard ignores damaged units (sound + damaged can exceed ordered)  · Severity: **High** · Status: **✅ FIXED (2026-06-19)**

**Resolution (2026-06-19):** The receive guard now caps cumulative **(sound + damaged)** per line at the ordered quantity — `line.receivedQty + line.damagedQty + rl.soundQty + rl.damagedQty > line.quantity → 400` (`purchase-orders.service.ts`). Made consistent end-to-end: line **completion** is now `receivedQty + damagedQty ≥ quantity` and **`outstandingQty` = `quantity − receivedQty − damagedQty`** (remaining capacity). Receipt lines are also de-duplicated (same product twice → 400). The staff receive dialog guard now checks `sound + damaged ≤ outstanding`. A genuine short-ship is resolved by the new **close-out** action (`POST /:id/close`, Partially Received → Completed, MGR/ADMIN). Regression tests added (`procurement.e2e-spec.ts`): damaged over-receipt → 400 (nothing booked), duplicate line → 400, close-out flow, illegal close → 409. Full e2e suite **81 green**. (The earlier `sound 100 + damaged 4` happy-path encoding was corrected to within-cap values.)

**Original report (Open):**

**What:** The receive endpoint validates only `soundQty` against the ordered quantity, not `soundQty + damagedQty`. A PO line can therefore be received with total physical units (sound + damaged) **greater than ordered**, violating the stock invariant that received quantity cannot exceed ordered.

**Repro (live, this session):**
1. PO-00001 line Cola COLA-330 ordered 100, nothing received yet.
2. `POST /api/v1/purchase-orders/{poId}/receipts` with `{"lines":[{"productId":"<cola>","soundQty":100,"damagedQty":5}]}` (as staff scoped to Central).
3. **Actual:** HTTP **201**. Line becomes received 100, damaged 5, outstanding 0; PO advances. Inventory: Cola Available 100 + Damaged 5 = **105 total units from a 100-unit order**. A RECEIVE movement "Avail +100, Dmg +5" is written. PO completes with Cola showing Received 100 / Damaged 5 / Outstanding 0.
4. **Expected:** HTTP 400 — over-receipt (105 physical units > 100 ordered), same as the sound-only guard.

**Contrast (the guard that *does* work):** `soundQty:150, damagedQty:0` is correctly rejected with 400 "Over-receipt for COLA-330: 150 received exceeds 100 ordered".

**Root cause:** `apps/api/src/purchase-orders/purchase-orders.service.ts` ~line 272:
```ts
if (line.receivedQty + rl.soundQty > line.quantity) {
  throw new BadRequestException(`Over-receipt for ${line.product.sku}: ...`);
}
```
The check sums only `soundQty`; `damagedQty` (incremented separately at ~line 309 into the Damaged bucket) is never counted against `line.quantity`. The UI mirrors this: the damaged `<input>` has no `max` attribute, while the sound input is capped at `max=<outstanding>`.

**Related asymmetry (note, not separate bug):** line completion is computed as `receivedQty >= quantity` using sound only (service ~line 331), and `outstandingQty = quantity - receivedQty`. So damaged units never count toward completion either — a line ordered 100, received sound 95 + damaged 5 (100 physical units delivered) would remain 5 outstanding indefinitely. Whatever rule is chosen for the cap should also be applied consistently to outstanding/completion.

**Test gap:** `apps/api/test/procurement.e2e-spec.ts` only tests over-receipt for `soundQty:101, damagedQty:0` (line ~288). It never tests sound+damaged combined; worse, line ~230 uses `soundQty:100, damagedQty:4` (104 vs 100 ordered) inside a *happy-path completion* assertion — so the current (buggy) behavior is encoded as expected, and the suite stays green. A regression test for `sound + damaged > ordered → 400` should be added when fixing.

---

## Observations (minor, not failures)

- **OBS-1 — Over-receipt has no in-app error message (sound path).** Submitting sound > outstanding in the staff dialog is blocked, but only by the native HTML5 `max` constraint (silent — no persistent app-level message like the all-zero case has). The button is not disabled; the click just no-ops. Low-severity UX gap. (The all-zero case does show a clear message: "Enter received quantities for at least one line".)
- **OBS-2 — Staff can read supplier data via API.** `GET /suppliers`, `GET /suppliers/:id`, and `GET /suppliers/:id/performance` carry no `@Roles` guard, so an authenticated Staff user gets HTTP 200 (incl. performance metrics). Writes (POST/PATCH/DELETE) are correctly gated to SUPER_ADMIN/WAREHOUSE_MANAGER, and the staff app surfaces no supplier UI. Appears intentional (staff need supplier context on the receive screen); flagged as an information-exposure note to confirm against intended policy.
- **OBS-3 — Staff home "My Tasks" is placeholder data.** The staff `/home` dashboard shows hardcoded sample tasks (e.g. "Receive PO-2842 · Sony Corp", "West Coast Hub") unrelated to real POs. Cosmetic; out of Phase 4 scope but noted.

## Deferred / Not covered

- **Delivery-note FILE upload — Deferred (by design).** Only a free-text "Delivery note ref" field exists on the receive dialog (DTO `deliveryNote?: string`, max 500). File/attachment upload is explicitly out of scope for this phase.
- **Supplier deactivate / include-inactive filter — Not exercised.** The Deactivate action and "Include inactive" toggle were present but not tested in this pass (out of the requested scenario list).

## Environment notes

- Procurement e2e (`procurement.e2e-spec.ts`) truncates shared dev tables (users + procurement). After running it, the dev DB was re-seeded: `npm run db:seed -w api` (Super Admin) **and** `npx ts-node apps/api/prisma/seed-staff.ts` (Staff scoped to Central). Both logins re-verified (HTTP 200). The Acme supplier / PO-00001 created during the UI pass were wiped by the e2e reset; all observations are preserved in the screenshots under `docs/qa/screenshots/qa-procurement-*`.
- No procurement-related client console errors. Pre-login `401/403/404` on `/auth/me` + `/auth/refresh` are expected auth probes; a stray `400 /inventory/adjust` originates from the staff dashboard, unrelated to this flow.
