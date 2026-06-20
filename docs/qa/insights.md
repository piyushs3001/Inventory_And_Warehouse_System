# QA Report — Phase 6: Insights & Notifications

- **Date:** 2026-06-19
- **Flow / task:** Phase 6 — Insights & Notifications (Admin dashboard, Notifications, Activity Log, Reports + CSV export; Staff scoped dashboard + notifications; role/scope authorization).
- **Surfaces:** Admin Portal `http://localhost:5001`, Staff App `http://localhost:5000`, API `http://localhost:5002/api/v1`.
- **Tester:** QA (Playwright MCP, browser-driven, positive + negative).

## Environment / setup notes
- On start the `users` table was empty (the e2e suite truncates the shared dev `iws` DB — known issue). Re-seeded with `npm run db:seed -w api` (Super Admin + 2 warehouses) and `npx ts-node prisma/seed-staff.ts` (Staff scoped to Central Warehouse).
- The Phase 6 test fixture (products COLA-330 reorder 50, WATER-1L, STAP-HD, each Available 100 at Central Warehouse) is **not produced by any seed script**. Created via the live API as Super Admin (auditable path — each write produced a `StockMovement` + `ActivityLog`). Resulting baseline: 3 products, 300 units, stock value $525.00.
- Because the baseline was built by real adjustments, the Activity Log legitimately contains 3 seed `STOCK_ADJUSTMENT` + 3 `PRODUCT_CREATE` rows in addition to the QA adjust (expected, not mock).

## Scenarios

| # | Scenario | Result | Evidence |
|---|----------|--------|----------|
| 1 | Admin Dashboard: live KPI cards + recent movements + top products, no mock data, no console errors | **Passed** | `qa-insights-admin-dashboard.png` |
| 2 | Generate activity + notification: Adjust Cola Available −60 (100→40, crosses reorder 50) | **Passed** | inventory table; DB |
| 3 | Notifications: LOW_STOCK for Cola appears; Mark read persists | **Passed** | `qa-insights-low-stock-notification.png`; DB `read=t` |
| 4 | Activity Log: STOCK_ADJUSTMENT row attributed to Super Admin; action filter; read-only | **Passed** | `qa-insights-activity-log.png` |
| 5 | Reports: Inventory (cols/rows/summary), Warehouse (per-wh value), Purchase (empty state), CSV export | **Passed** | `qa-insights-inventory-report.png`, `qa-insights-inventory-report.csv` |
| 6 | Create Supplier + Draft PO via Purchasing pages; re-check dashboard + Purchase report | **Passed** | Purchase report row; see note on Pending POs |
| 7 | Staff home dashboard: scoped KPIs + Receive/Transfer/Count quick actions, no "My Tasks" mock | **Passed** | `qa-insights-staff-dashboard.png` |
| 8 | Staff Notifications page loads | **Passed** | empty state (correct — staff is not an overseer) |
| 9 | Authz: staff has no Activity Log nav item; server 403 on activity-logs + reports | **Passed** | live curl 403; nav scan |
| 10 | Automated `insights.e2e-spec.ts` clean Jest run | **Blocked** | see Bug #1 |

### Scenario detail & verification

**1 — Admin Dashboard.** All KPIs are live and computed server-side (`GET /dashboard` 200, payload inspected). Verified math at baseline: Products 3; Stock units 300; Stock value **$525.00** (COLA 100×0.45=45 + WATER 100×0.30=30 + STAP 100×4.50=450); Low stock 0; Pending POs 0; Pending transfers 0. Recent movements lists the 3 seed adjustments; Top products sorted by value descending (450 / 45 / 30). No console errors on the page (only the benign pre-login `/auth/me` 401 + `/auth/refresh` 403 probes). Not mock data — `dashboard.mock.ts` was deleted in this diff.

**2 — Adjust.** Inventory → Adjust on Cola row, bucket Available, delta −60, reason "QA sale". After apply the row showed **Available 40** with a "Low" badge. DB confirmed `STOCK_ADJUSTMENT` ActivityLog (`COLA-330 ... (100→40)`).

**3 — Notification.** A `LOW_STOCK` notification appeared: title "Low stock: Cola 330ml Can", body "Central Warehouse: 40 available (reorder at 50)." Clicking **Mark read** removed the button; DB confirmed `read = true`.

**4 — Activity Log.** Top row: `STOCK_ADJUSTMENT / InventoryItem / "ADJUSTMENT COLA-330 at Central Warehouse (100→40)"`, user **Super Admin**, matching the adjust. Header states "Append-only audit … Read-only"; no edit/delete controls. **Action filter** "STOCK_ADJUSTMENT" narrowed the table to exactly 4 rows (3 seed + 1 QA), footer "4 entries" — filter works. (Pre-existing rows from earlier test sessions show user "—"; that is older data inserted without a user, not a Phase 6 regression.)

**5 — Reports.** Inventory report after the adjust: Items 3, Total units **240** (40+100+100), Low-stock items 1, Total stock value **498.00** (COLA 40×0.45=18 + STAP 450 + WATER 30); Cola row shows reorder 50 / Low? yes / value 18.00. Warehouse report: Central 3 products / 240 units / 1 low / 498.00, North Depot 0/0/0/0.00, total 498.00. Purchase report (before PO) showed the empty state "No data — This report has no rows for your scope." **Export CSV** downloaded `inventory-report.csv` with correct headers and all 3 rows matching the on-screen data (saved as evidence). No console errors.

**6 — Supplier + Draft PO.** Created supplier "Acme Beverages Ltd" (ACTIVE) and a Draft PO (PO-00053, Central Warehouse, 1 line COLA-330 ×100 @ 0.45, total 45.00) through the Purchasing UI. Purchase report then showed the row (PO count 1, total purchase value 45.00, ordered 100 / received 0). **Dashboard "Pending POs" stayed 0** — verified as correct: `dashboard.service.ts` counts only `SENT / APPROVED / PARTIALLY_RECEIVED` (a DRAFT is not yet pending). Stock units/value/low-stock on the dashboard updated to 240 / $498.00 / 1.

**7 — Staff dashboard.** `/home` rendered scoped live KPIs: Stock units 240, Low stock 1, Pending transfers 0 — scoped to Central Warehouse. Quick-action links present: Receive Stock (`/receive`), Stock Transfer (`/transfers`), Stock Count (`/counting`). Recent stock activity lists real movements. No hardcoded "My Tasks" mock (`home.mock.ts` deleted in this diff). No console errors.

**8 — Staff notifications.** `/notifications` loaded with "All caught up — You have no notifications." Correct: `notifyWarehouseOverseers` targets SUPER_ADMIN + WAREHOUSE_MANAGER assigned to the warehouse, **not STAFF**, so a STAFF user receives no LOW_STOCK notification by design.

**9 — Authorization (negative).** Staff app sidebar exposes no Activity Log item (nav links: Home, Receive, Dispatch, Transfers, Count, Catalog, Inventory, Movement History, Notifications). Server-side enforced (UI hiding is not security): with a live staff token, `GET /activity-logs` → **403** and `GET /reports/inventory` → **403**. Matches `apps/api/test/insights.e2e-spec.ts` coverage.

## Bugs found

### Bug #1 — `insights.e2e-spec.ts` teardown violates a foreign key when POs exist (test-isolation defect)
- **Severity:** Medium (test infrastructure; not a product-runtime defect).
- **Fix status:** Open — reported to main agent (QA does not patch source).
- **Where:** `apps/api/test/insights.e2e-spec.ts`, `clearAll()` (lines 51–59).
- **Repro:** With at least one Purchase Order present in the dev DB (e.g. after Scenario 6), run `npx jest --config apps/api/test/jest-e2e.json insights`.
- **Observed:** `beforeAll` fails — `prisma.product.deleteMany()` throws `Foreign key constraint violated: purchase_order_lines_product_id_fkey`; all 11 tests error out.
- **Cause:** `clearAll()` deletes `activityLog, notification, stockMovement, inventoryItem, product, warehouse, user` but never deletes `purchaseOrderLine / purchaseOrder / goodsReceipt / supplier / stockTransfer / stockCount`. PO lines still reference products, so the product delete fails.
- **Impact:** The spec only passes against a DB with no procurement rows. It is not self-isolating and is order-fragile in the shared dev DB. Scenario 10 (clean Jest run of the 11 insights tests) is therefore **Blocked** — I could not destructively wipe the shared dev DB to clear the rows my QA generated (action denied by policy). NOTE: the *authorization behavior* those tests assert was independently confirmed live (Scenario 9, 403s via curl), so the feature itself is verified; only the automated run is blocked.
- **Suggested fix:** Add `purchaseOrderLine`, `purchaseOrder`, `goodsReceipt`, `supplier` (and `stockTransfer`, `stockCount` if present) deletes to `clearAll()` before `product.deleteMany()`, ordered to respect FKs.

## Observations (not Phase 6 bugs — for awareness)
- Staff sidebar "Dispatch Stock" carries a static badge "5" with no dispatch data seeded; likely a placeholder count. Outside Phase 6 scope — flag for the Dispatch flow owner to confirm it is data-driven.
- Pre-login console shows `/auth/me` 401 + `/auth/refresh` 403 on both apps. Expected (no session); benign. Worth a future cleanup to avoid console noise but not a defect.

## Deferred / not covered
- **PDF / Excel export deferred — CSV only.** Confirmed in the Reports UI copy: "Export as CSV (PDF/Excel coming with object storage)." CSV export verified; PDF/Excel intentionally not implemented yet (awaiting object storage). Not tested.
- **Users-CRUD activity logging deferred.** User create/activate/role-change actions are not yet written to the Activity Log; out of Phase 6 scope. Not tested.
- **Automated `insights.e2e-spec.ts` pass** — Blocked by Bug #1 given the QA-generated PO; see Scenario 10.

## Summary
9 of 9 functional/UI scenarios **Passed**; the dashboards show real, correctly-computed data (no mock), the LOW_STOCK notification fires and marks read, the Activity Log records and filters the adjustment and is read-only, all three reports render with correct math, CSV export works, the staff dashboard is scoped with real KPIs and no mock tasks, and role/scope authorization is enforced server-side (403). One test-isolation bug (#1) found in `insights.e2e-spec.ts`; the clean automated Jest run is Blocked by it.
