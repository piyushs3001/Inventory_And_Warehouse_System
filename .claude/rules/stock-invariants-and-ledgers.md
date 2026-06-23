---
paths:
  - "apps/api/**/inventory/**"
  - "apps/api/**/movements/**"
  - "apps/api/**/transfers/**"
  - "apps/api/**/stock-counts/**"
  - "apps/api/**/purchase-orders/**"
  - "apps/api/**/goods-receipts/**"
---

# Stock Invariants & Ledgers

These are non-negotiable invariants for the Inventory & Warehouse System. Breaking one is a defect, not a style choice. Full context: `CLAUDE.md` + `docs/PRD.md` §5.4, §5.10, §7, §10.

## The four buckets

A SKU at a warehouse splits into exactly four buckets — together they are the full picture:

```
available + reserved + damaged + inTransit
```

- **One `InventoryItem` per (Product/Variant × Warehouse).** Same SKU, independent quantities per location. Never store a single global quantity.
- A transition moves quantity *between* buckets; it never invents or destroys quantity except via an explicit Receive (in) or Sale/dispatch (out).

| Transition | Effect |
|---|---|
| Reserve | Available → Reserved (stays in warehouse) |
| Receive | increases Available; damaged goods → Damaged |
| Transfer out | source Available → In-Transit |
| Transfer in | In-Transit → destination Available |
| Adjust (incl. count reconciliation) | corrects a bucket, requires a reason |

## The audit-trail invariant (most violated)

**Every quantity change writes a `StockMovement` in the SAME Prisma transaction as the `InventoryItem` update.** No exceptions, no "I'll log it after."

- Movement fields: `user, timestamp, beforeQty, afterQty, type, reason, refId`, plus product/variant + warehouse.
- **Movement types are a closed set:** `Receive · Transfer · Adjustment · Sale · Return`. Do not add new types.
- If the movement write can't happen, the quantity update must roll back. Multi-write → one `prisma.$transaction`, never partial writes.

## Two distinct ledgers — don't conflate them

- **`StockMovement`** — *quantity* changes only. Backbone of audit + AI forecasting.
- **`ActivityLog`** — *all* meaningful actions (create/update/delete/approve/receive/transfer/adjust) with user, time, entity, before/after.
- A quantity change writes **both**. A non-quantity action (e.g. edit a supplier) writes **only** ActivityLog.
- **Both are append-only.** Never `UPDATE` or `DELETE` a row in either. To correct a mistake, write a compensating movement/adjustment.

## Related rules

- **Soft-delete** products/warehouses that have stock or history; never hard-delete.
- **Money/qty:** integer minor units or `Decimal` — never float. Stock value = Σ (qty × cost price).
- **Index** inventory + movements by (product, warehouse, date); paginate movement queries.

## Checklist before claiming a quantity-changing task done

- [ ] Quantity update and its `StockMovement` are in one `prisma.$transaction`.
- [ ] Movement records before/after, user, type (from the closed set), reason, ref.
- [ ] `ActivityLog` entry written for the action.
- [ ] No ledger row is ever updated or deleted.
- [ ] Bucket math is conserving (no quantity created/lost outside Receive/Sale).
- [ ] The mutated `InventoryItem` is the correct (product/variant × warehouse) row.
- [ ] A test covers the invariant (movement written, transaction rolls back together).
