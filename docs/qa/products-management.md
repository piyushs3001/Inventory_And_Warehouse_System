# QA Report — Phase 2 Slice 3 — Products (admin manage + staff catalog)

- **Flow/task:** Phase 2 Slice 3 — Products (Admin `/products` manage screen + Staff `/catalog` read-only browse)
- **Date:** 2026-06-19
- **Tester:** qa-tester (Playwright MCP, real browser)
- **Environment:** Admin Portal `http://localhost:5001`, Staff App `http://localhost:5000`, API `http://localhost:5002/api/v1`. DB freshly seeded (Super Admin + Staff + 2 warehouses, no categories/products).
- **Test data created during run:** categories `Beverages`, `Snacks`; products `Cola 330ml` (COLA-330, later ARCHIVED), `Water 500ml` (WATER-500, ACTIVE).

## Summary

All in-scope scenarios **Passed**. No defects found. One minor cosmetic observation (non-blocking) noted below.

## Part A — Admin `/products` (as Super Admin `admin@iws.local`)

### Positive

| # | Scenario | Result | Notes / Evidence |
|---|----------|--------|------------------|
| A1 | Login → Operations → Products → `/products`, empty state | **Passed** | Empty state "No products / Create a product to build out the catalog." rendered. |
| A2 | Create category `Beverages` on `/categories`, returns to product form dropdown | **Passed** | Beverages row created; appears in product form Category dropdown and in the `/products` category filter. |
| A3 | Create product Cola 330ml / COLA-330 / Beverages / can / cost 0.45 / sell 1.20 / reorder 50 | **Passed** | Row appears: cost cell `0.45`, sell cell `1.20` (2-decimal Decimal strings), status `ACTIVE`. Screenshot: `screenshots/qa-products-admin-create.png`. |
| A4 | Edit product — change selling price to 1.50 → persists after reload | **Passed** | After full page reload, sell cell shows `1.50`. |
| A5 | Search `cola` → row matches; search `zzz` → no rows; clear | **Passed** | `?search=cola` → 1 row; `?search=zzz` → empty state. Network confirmed GET 200. |
| A6 | Filter by category Beverages → product shows; filter by empty category (Snacks) → no rows | **Passed** | Beverages → Cola row; Snacks (no products) → empty state. Confirms filter excludes non-matches, not just a no-op. |
| A7 | Archive Cola 330ml → leaves default list; "Include archived" → reappears with ARCHIVED badge, Archive button gone | **Passed** | After archive (confirm dialog accepted), default list shows only Water 500ml. "Include archived" on → Cola row returns with `ARCHIVED` badge and only an Edit button (no Archive). Screenshot: `screenshots/qa-products-admin-archived.png`. |

### Negative

| # | Scenario | Result | Notes / Evidence |
|---|----------|--------|------------------|
| A8 | Duplicate SKU — create second product with SKU `COLA-330` | **Passed** | API returns `POST /products → 409 Conflict`; dialog surfaces inline alert "A product with this SKU already exists"; dialog stays open, no crash. Screenshot: `screenshots/qa-products-duplicate-sku.png`. |
| A9 | Empty Name + empty SKU submit → blocked client-side, no POST | **Passed** | Native `required` validation blocks submit (Name `validity.valid=false`, message "Please fill in this field."); dialog stays open; verified **no** `POST /products` fired after the empty submit. |

## Part B — Staff `/catalog` (as Staff `staff@iws.local`)

| # | Scenario | Result | Notes / Evidence |
|---|----------|--------|------------------|
| B1 | Login as staff → Lookup → Catalog → `/catalog` | **Passed** | Catalog link present under "Lookup" group; navigates to `/catalog`. |
| B2 | Part-A products visible (name, SKU, resolved category name, selling price) | **Passed** | Water 500ml shown: name, `WATER-500`, category resolved to `Beverages`, price `0.90`. The ARCHIVED Cola 330ml is correctly **not** shown (API excludes archived by default). Screenshot: `screenshots/qa-products-staff-catalog.png`. |
| B3 | Search works | **Passed** | `water` → 1 row; `zzz` → empty state. |
| B4 | **CRITICAL — read-only:** no New product / Edit / Archive / Delete controls anywhere on the catalog | **Passed** | Programmatic scan of `<main>`: 0 buttons, 0 links; page text contains none of "new product", "edit", "archive", "delete". Only columns are Name / SKU / Category / Price (no Actions column). |

## Bugs found

None.

## Minor / cosmetic observations (non-blocking)

- **Staff catalog no-match empty-state copy.** When a search returns no matches, the staff catalog shows "No products / The product catalog is empty." — the same empty-state used when the catalog truly has no products. Slightly misleading on a no-result search. Cosmetic only; does not affect the slice. (Admin `/products` shares the same pattern via its empty state.)

## Deferred / covered elsewhere

- **Staff-403 on product writes** (POST/PATCH/archive as STAFF) and **duplicate-SKU server enforcement** — covered by API e2e (`apps/api/test/products-crud.e2e-spec.ts`). Not re-driven through the browser here. Recorded as **covered-by-e2e**.
- **Out-of-scope warehouse** — products are a global catalog (not warehouse-scoped per the data model: stock is per-warehouse via `InventoryItem`, but `Product` is global), so warehouse-scope rejection does not apply to this flow.

## Notes

- No browser console errors during either session (the single console error observed in the admin session was the expected 409 network response on the duplicate-SKU POST).
- Did not re-seed the DB; logins worked throughout.
