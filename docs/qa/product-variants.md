# QA — Product Variants (Phase 2 · Slice 4)

**Date:** 2026-06-20 · **Flow:** Catalog → Product Variants (catalog-only)
**Spec:** `docs/superpowers/specs/2026-06-20-phase-2-slice-4-variants-design.md`
**Surfaces:** Admin Portal `/products` (manage), Staff App `/catalog` (read-only)
**Method:** Playwright MCP, live servers (API :5002, admin :5001, staff :5000), seeded Super Admin + a created Warehouse Manager.

## Summary

**11/11 scenarios passed. No open bugs.** One code-review finding (array-index React keys on the editable attribute rows) was fixed before QA. Automated coverage: api unit **117** (incl. 11 variants service specs), e2e **129** (incl. 11 variants-crud), admin **55**, staff **49** — full `npm run qa:gate` green.

## Scenarios

| # | Scenario | Surface | Type | Result |
|---|---|---|---|---|
| 1 | Create dialog shows **no** Variants section (needs a saved product) | Admin | Positive (boundary) | **Passed** |
| 2 | Edit dialog shows Variants section with empty-state copy | Admin | Positive | **Passed** |
| 3 | Add a variant (SKU `TSHIRT-L`, attribute `size=L`) → appears in list with chip | Admin | Positive | **Passed** |
| 4 | Add a second variant (`TSHIRT-M`, `size=M`) | Admin | Positive | **Passed** |
| 5 | Variant SKU == parent product SKU (`TSHIRT-BASE`) → inline **409** "A product with this SKU already exists" | Admin | Negative | **Passed** |
| 6 | Variant SKU == existing variant SKU (`TSHIRT-L`) → inline **409** "A variant with this SKU already exists" | Admin | Negative | **Passed** |
| 7 | Archive a variant → confirm dialog → removed from the active list (soft-delete) | Admin | Positive | **Passed** |
| 8 | Archived variant excluded from the default (active) list | Admin | Negative/boundary | **Passed** |
| 9 | Staff catalog row shows an expand toggle; expanding **lazy-loads** + lists active variants (`TSHIRT-M · size: M`) | Staff | Positive | **Passed** |
| 10 | Staff catalog variant view is **read-only** — no Edit/Archive/Add controls | Staff | Negative (authz UI) | **Passed** |
| 11 | Archived variant (`TSHIRT-L`) not shown in staff catalog | Staff | Negative/boundary | **Passed** |

### Evidence (screenshots)
- `screenshots/qa-variants-01-admin-variant-added.png` — variant added with attribute chip.
- `screenshots/qa-variants-02-dup-sku-409.png` — cross-table SKU conflict surfaced inline.
- `screenshots/qa-variants-03-staff-catalog-expanded.png` — staff read-only expanded variant list.

## Covered by automated tests (not re-driven in the browser)

- **Staff (STAFF role) write → 403** on POST/PATCH/DELETE variants — `variants-crud.e2e-spec.ts` (the browser QA used a Manager, who legitimately *can* write; the catalog UI exposes no write controls regardless).
- **Unknown productId → 404**, **variant under another product → 404** (nested-route ownership) — e2e + service spec.
- **Non-string attribute value → 400** (`{ size: 42 }`) — e2e.
- **`includeArchived=true` returns archived** — e2e.
- **Unauthenticated GET → 401** — e2e.

## Bugs found & fixed

- **(pre-QA, code review) Array-index React keys** on the editable attribute key/value rows in `variants-section.tsx` would rebind input state to the wrong row after a mid-list removal. **Fixed** — switched to stable per-row ids (`init-*` / `new-*` via a ref counter) before the QA pass. Re-verified add/edit in the browser.

## Not covered / deferred

- **Stock-bearing variants** — out of scope by design; stock stays at Product level (`InventoryItem` untouched). Future slice.
- **Barcode/QR generation & image upload** — Slice 5 (MinIO). The variant `barcode` field accepts a manual string only.
- **Per-variant price override** — not built (variants inherit the product price).
