# QA Report — Category Management

- **Flow / Task:** Phase 2 Slice 2 — Category Management (Admin Portal)
- **Date:** 2026-06-19
- **Tester:** qa-tester (Playwright MCP, real browser)
- **Surface:** Admin Portal (http://localhost:5001)
- **API:** http://localhost:5002/api/v1
- **Test user:** Super Admin (`admin@iws.local`)
- **DB at start:** Freshly seeded — Super Admin + 2 warehouses, no categories.

## Summary

All 9 scenarios (6 positive + 3 negative) **Passed**. No bugs found. The page
correctly persists data, resolves parent names (not UUIDs), blocks empty names
client-side, excludes a category from its own parent dropdown, and surfaces the
server's 409 "child categories" conflict as an inline `role="alert"` without
crashing.

## Positive scenarios

| # | Scenario | Result | Evidence |
|---|----------|--------|----------|
| 1 | Login as Super Admin → lands in admin portal (redirect to `/`) | **Passed** | Redirected from `/login` to `/`; sidebar shows "Super Admin". |
| 2 | Navigate to Categories via sidebar (Operations → Categories) → `/categories`, empty state shown | **Passed** | Lands on `/categories`; "No categories" / "Create a category to organize the product catalog." `qa-categories-01-empty-state.png` |
| 3 | Create root category "Beverages" (parent = None/root) → row with Parent "—" | **Passed** | `POST /categories → 201`; row "Beverages", Parent cell "—". |
| 4 | Create child "Sodas" with parent = Beverages → Parent shows resolved NAME "Beverages" | **Passed** | `POST /categories → 201`; row "Sodas", Parent cell "Beverages" (name, not id/uuid). `qa-categories-02-parent-resolved.png` |
| 5 | Edit "Sodas" → rename to "Soft Drinks" → persists after reload | **Passed** | `PATCH /categories/{id} → 200`; after full page reload row reads "Soft Drinks" / parent "Beverages". |
| 6 | Delete a leaf ("Soft Drinks", no children) → confirm prompt → row disappears (hard delete) | **Passed** | Native confirm "Delete this category?" accepted; `DELETE /categories/{id} → 200`; row removed, only "Beverages" remains. |

## Negative scenarios

| # | Scenario | Result | Evidence |
|---|----------|--------|----------|
| N1 | Delete a category that has children (recreated "Juices" under "Beverages", then delete "Beverages") → 409 + inline message "Category has child categories", no crash / silent failure | **Passed** | `DELETE /categories/{id} → 409 Conflict`; inline `alert` "Category has child categories" rendered above the table; both rows still present; only console entry is the expected 409 network log (no JS exception). `qa-categories-04-delete-parent-409-alert.png` |
| N2 | Empty-name validation — open create dialog, leave Name blank, submit → blocked client-side, no POST fired, dialog stays open | **Passed** | Clicking Create with blank Name fired **no** `POST /categories`; dialog remained open (required field). |
| N3 | Self-parent prevention — Edit a category; its own name must NOT appear as a selectable parent | **Passed** | Edit "Sodas" dialog parent dropdown listed only "None (root)" and "Beverages" — "Sodas" itself absent. `qa-categories-03-self-parent-excluded.png` |

## Bugs found

None.

## Covered by API e2e (not re-tested in browser)

Per the slice spec, the following are proven by the API e2e suite
(`apps/api/test/categories-crud.e2e-spec.ts`) and recorded here as covered, not
as browser gaps:

- **Staff role gets 403 on category writes (POST/PATCH/DELETE).** Staff cannot
  reach the Admin Portal at all (gated at the admin `/login`), so this is a
  server-side authz concern exercised at the API layer.
- **Re-parent cycle prevention (deeper than self-parent) → 409.** E.g. setting a
  parent's parent to one of its own descendants.

## Deferred / not covered

- **Out-of-scope warehouse:** N/A for categories — categories are a global
  catalog concept (not warehouse-scoped), so there is no warehouse-scope
  dimension to test on this flow.
- **Duplicate-name handling:** not part of the slice's stated acceptance
  criteria; not exercised. Recommend confirming intended behavior (allowed vs.
  rejected) in a future pass.

## Notes

- The delete confirmation is a **native browser `confirm()`** ("Delete this
  category?"), not a custom modal. It works, but is a UX inconsistency vs. the
  custom dialogs used elsewhere — flagged for awareness only, not a defect.
- Parent dropdown correctly updates to include newly created categories without
  a manual refresh.
