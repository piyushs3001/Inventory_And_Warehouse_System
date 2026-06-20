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
  Skeleton,
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
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

  return (
    <div className="flex flex-col gap-4">
      <PageHead title="Receive Stock" />
      <p className="text-sm text-muted-foreground -mt-2">
        Approved purchase orders awaiting delivery into your warehouse(s).
      </p>

      {isLoading ? (
        <div className="flex flex-col gap-2">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-12 w-full" />
          ))}
        </div>
      ) : incoming.length === 0 ? (
        <EmptyState
          title="Nothing to receive"
          description="No approved purchase orders are awaiting receipt for your warehouses."
        />
      ) : (
        <div className="rounded-xl bg-card ring-1 ring-foreground/10 overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Code</TableHead>
                <TableHead>Supplier</TableHead>
                <TableHead>Warehouse</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Outstanding lines</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {incoming.map((po) => {
                const outstanding = po.lines.filter((l) => l.outstandingQty > 0).length;
                return (
                  <TableRow key={po.id}>
                    <TableCell className="font-mono text-xs font-semibold">{po.code}</TableCell>
                    <TableCell>{po.supplierName}</TableCell>
                    <TableCell>{po.warehouseName}</TableCell>
                    <TableCell>
                      <StatusBadge tone={po.status === PurchaseOrderStatus.APPROVED ? 'transit' : 'warn'}>
                        {po.status.replace(/_/g, ' ')}
                      </StatusBadge>
                    </TableCell>
                    <TableCell className="text-right tabular-nums">{outstanding}</TableCell>
                    <TableCell className="text-right">
                      <Button size="sm" onClick={() => setReceiving(po)}>Receive</Button>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      )}

      {receiving && (
        <ReceiveGoodsDialog po={receiving} onClose={() => setReceiving(null)} onSuccess={invalidate} />
      )}
    </div>
  );
}
