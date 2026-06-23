---
paths:
  - "apps/api/**/purchase-orders/**"
  - "apps/api/**/goods-receipts/**"
  - "apps/api/**/transfers/**"
  - "apps/api/**/stock-counts/**"
---

# Domain State Machines

Three workflows are state machines. Only the transitions below are legal; reject or guard anything else. Each transition that moves quantity also obeys the **stock-invariants-and-ledgers** rule (write a `StockMovement` in the same transaction) and the **authorization-role-scope** rule (role + scope gating). Full context: `docs/PRD.md` §5.6–5.9, §9.

## Purchase Order

```
Draft → Sent → Approved → Partially Received → Completed
```

- Approval may be required by settings/threshold — don't assume it's always needed, but enforce it when configured.
- Receiving is done via Goods Receiving, reconciling **ordered vs received per line** (`PurchaseOrderLine.receivedQty`).
- Short receipt (received < ordered across lines) → **Partially Received**; fully reconciled → **Completed**.
- Receiving increases destination **Available**; damaged goods go to **Damaged**, never Available, and flag supplier performance.
- Delivery notes upload to S3/MinIO, attached to the `GoodsReceipt`.

## Stock Transfer

```
Request → Approve → Receive
```

- **Request** (source): Available → In-Transit. Writes a Transfer movement (out).
- **Approve**: by Warehouse Manager / Super Admin.
- **Receive** (destination): In-Transit → Available. Writes a Transfer movement (in).
- Both legs are Transfer movements; the in-transit quantity is never lost between legs.

## Stock Count (Audit)

```
session → enter counted → variance = counted − recorded → reconcile
```

- **Variance = counted (physical) − recorded (system).**
- Reconcile writes an **Adjustment** movement (with a reason) to bring the system in line with physical reality.
- Counting never edits quantities directly — it always goes through an Adjustment movement.

## Checklist before claiming a workflow task done

- [ ] Only legal transitions are reachable; illegal ones are rejected with a clear error.
- [ ] Approval gating respects settings/threshold and role.
- [ ] Every quantity-moving leg writes the correct `StockMovement` in one transaction.
- [ ] PO receiving reconciles per line and sets Partially Received vs Completed correctly.
- [ ] Damaged goods land in Damaged, not Available, and flag supplier performance.
- [ ] Tests cover happy path + at least one illegal-transition rejection.
