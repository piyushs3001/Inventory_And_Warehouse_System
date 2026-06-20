# QA — Dialogs → dedicated pages + DataTable pagination (admin + staff)

**Date:** 2026-06-20
**Change:** Replaced create/edit **pop-up dialogs** with **dedicated routed pages** across both
apps; swapped every list's raw `<Table>` for a shared **`DataTable`** (`@iws/ui`) with search +
client-side pagination; eliminated the **table-in-table** (product variants + staff catalog) by
introducing **product detail pages**. Built via a 13-agent parallel workflow; foundation
(`DataTable`) authored first. **No API or generated-client changes** — pagination is client-side.

## Decisions (user-approved)
- **Client-side pagination** (shared `DataTable`; list endpoints still return full arrays).
- **Entity CRUD + create flows → pages**; quick stock actions (adjust/reserve/receive) and
  assignment dialogs (assign-staff, assign-warehouses) + supplier-performance view **stay modals**.
- **Product detail pages**: admin `/products/[id]` hosts variants + barcodes; staff `/catalog/[id]`
  is a read-only detail — no nested/expanding tables anywhere.

## What changed
- **Dialog → pages:** categories, products, suppliers, warehouses, users (admin); purchase-orders,
  transfers, counting create flows (admin); staff transfers request. Each: extracted `*-form.tsx`,
  added `<domain>/new` + `<domain>/[id]/edit` routes, list "New/Edit" became `<Link>`s, old
  `*-form-dialog.tsx` deleted.
- **Product detail** `/products/[id]` (admin) + `/catalog/[id]` (staff, read-only) — variants &
  barcodes now live here as page regions, not in a dialog and not as a table inside a table.
- **DataTable adopted** on every list (incl. long ledgers: movements, activity) for search + paging.
- **Kept as modals:** inventory adjust/reserve, staff receive-goods, assign-staff,
  assign-warehouses, supplier performance.

## Build verification (full `qa:gate`)
| Check | Result |
|---|---|
| typecheck (all packages) | ✅ clean |
| lint (api/staff/admin) | ✅ clean (1 pre-existing unrelated warning) |
| unit — `@iws/*` + api (jest) + staff + admin (vitest) | ✅ all pass |
| build (admin + staff) | ✅ compiled |
| e2e (api, serial) | ✅ 138/138 |

Bug fixed during verification: the staff `catalog/[id]` test failed on (a) React-Query default
**retry** delaying the 404 error past the wait, and (b) synchronous assertions on secondary
(variants/category) queries. Fixed the test (retry:false + `waitFor` the async assertions) — page
logic was correct.

## Browser QA (Playwright MCP) — verified via DOM assertions

| # | Scenario | Surface | Type | Result |
|---|---|---|---|---|
| 1 | Products list paginates — 12 rows → "Page 1 of 2", 10/page, "12 total" | Admin | Positive | **Passed** |
| 2 | Next → "Page 2 of 2" shows the remaining 2 rows | Admin | Positive | **Passed** |
| 3 | "New product" is a **dedicated page** `/products/new` (not a dialog), with Back link + all fields | Admin | Positive | **Passed** |
| 4 | Create with a duplicate SKU → **409 surfaced inline**, stays on the page | Admin | Negative | **Passed** |
| 5 | Create with a unique SKU → succeeds, redirects to `/products` | Admin | Positive | **Passed** |
| 6 | Product **detail** `/products/[id]` shows Variants + Barcode regions, an Edit link, **0 nested tables**, not a dialog | Admin | Positive | **Passed** |
| 7 | `/warehouses/new` is also a dedicated page (pattern generalizes) | Admin | Positive | **Passed** |
| 8 | Staff catalog has **no expand toggle / 0 nested tables**; rows link to a detail page | Staff | Positive | **Passed** |
| 9 | Staff `/catalog/[id]` detail renders read-only (Variants present, **0 management controls**) | Staff | Negative (read-only) | **Passed** |

Evidence: `screenshots/qa-dtp-product-detail.png` (admin product detail) — captured; note
screenshots are intermittently cleared by an environment process, so results above are recorded
from live DOM assertions.

## Coverage notes / deferred
- **Browser-verified in depth:** admin products (list/create/detail/edit-link + negative 409),
  admin warehouses (create page), staff catalog (list + detail).
- **Verified by build + unit tests** (not each driven in the browser): categories, suppliers, users,
  purchase-orders, transfers, counting create/edit pages; staff transfers request page; the
  movements/activity/notifications/inventory list-table pagination. All compiled, typecheck-clean,
  and unit-tested; they follow the identical extracted-form + DataTable recipe.
- **Unchanged (still modals, by decision):** inventory adjust/reserve, staff receive, assign-staff,
  assign-warehouses, supplier performance.
- No API/contract change, so e2e/authz behavior is unaffected.
