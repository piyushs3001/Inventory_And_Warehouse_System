'use client';

import { useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import {
  usePurchaseOrdersControllerList,
  getPurchaseOrdersControllerListQueryKey,
  PurchaseOrderStatus,
} from '@iws/api-client';
import type { PurchaseOrderDto } from '@iws/api-client';
import {
  Button,
  PageHead,
  StatusBadge,
  EmptyState,
  DataTable,
  type DataTableColumn,
} from '@iws/ui';
import { ReceiveGoodsDialog } from './receive-goods-dialog';

// Incoming POs awaiting receipt for the staff member's assigned warehouse(s).
// Only APPROVED / PARTIALLY_RECEIVED orders can be received against.
const RECEIVABLE: PurchaseOrderStatus[] = [
  PurchaseOrderStatus.APPROVED,
  PurchaseOrderStatus.PARTIALLY_RECEIVED,
];

export default function ReceiveStockPage() {
  const params = {};
  const { data: orders, isLoading } = usePurchaseOrdersControllerList(params);
  const [receiving, setReceiving] = useState<PurchaseOrderDto | null>(null);
  const queryClient = useQueryClient();

  const incoming = (orders ?? []).filter((po) => RECEIVABLE.includes(po.status));

  const invalidate = async (): Promise<void> => {
    await queryClient.invalidateQueries({
      queryKey: getPurchaseOrdersControllerListQueryKey(params),
    });
  };

  const columns: DataTableColumn<PurchaseOrderDto>[] = [
    {
      key: 'code',
      header: 'Code',
      className: 'font-mono text-xs font-semibold',
      cell: (po) => po.code,
      sortValue: (po) => po.code,
    },
    {
      key: 'supplier',
      header: 'Supplier',
      cell: (po) => po.supplierName,
      sortValue: (po) => po.supplierName,
    },
    {
      key: 'warehouse',
      header: 'Warehouse',
      cell: (po) => po.warehouseName,
      sortValue: (po) => po.warehouseName,
    },
    {
      key: 'status',
      header: 'Status',
      cell: (po) => (
        <StatusBadge tone={po.status === PurchaseOrderStatus.APPROVED ? 'transit' : 'warn'}>
          {po.status.replace(/_/g, ' ')}
        </StatusBadge>
      ),
      sortValue: (po) => po.status,
    },
    {
      key: 'outstanding',
      header: 'Outstanding lines',
      align: 'right',
      className: 'tabular-nums',
      cell: (po) => po.lines.filter((l) => l.outstandingQty > 0).length,
      sortValue: (po) => po.lines.filter((l) => l.outstandingQty > 0).length,
    },
    {
      key: 'actions',
      header: 'Actions',
      align: 'right',
      cell: (po) => (
        <div className="flex justify-end gap-2">
          <Button size="sm" onClick={() => setReceiving(po)}>Receive</Button>
        </div>
      ),
    },
  ];

  return (
    <div className="flex flex-col gap-4">
      <PageHead title="Receive Stock" />
      <p className="text-sm text-muted-foreground -mt-2">
        Approved purchase orders awaiting delivery into your warehouse(s).
      </p>

      <DataTable
        rows={incoming}
        getRowKey={(po) => po.id}
        isLoading={isLoading}
        searchPlaceholder="Search by code, supplier or warehouse…"
        searchFilter={(po, q) =>
          po.code.toLowerCase().includes(q) ||
          po.supplierName.toLowerCase().includes(q) ||
          po.warehouseName.toLowerCase().includes(q)
        }
        empty={
          <EmptyState
            title="Nothing to receive"
            description="No approved purchase orders are awaiting receipt for your warehouses."
          />
        }
        columns={columns}
      />

      {receiving && (
        <ReceiveGoodsDialog po={receiving} onClose={() => setReceiving(null)} onSuccess={invalidate} />
      )}
    </div>
  );
}
