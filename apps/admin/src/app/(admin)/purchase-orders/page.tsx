'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useQueryClient } from '@tanstack/react-query';
import {
  usePurchaseOrdersControllerList,
  getPurchaseOrdersControllerListQueryKey,
  useSuppliersControllerList,
  useWarehousesControllerList,
  useProductsControllerList,
  PurchaseOrderStatus,
} from '@iws/api-client';
import type { PurchaseOrderDto } from '@iws/api-client';
import {
  Button,
  buttonVariants,
  PageHead,
  StatusBadge,
  EmptyState,
  Skeleton,
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@iws/ui';
import { CreatePoDialog } from './create-po-dialog';
import { PO_STATUS_TONE } from './po-status';

export default function PurchaseOrdersPage() {
  const [status, setStatus] = useState('');
  const [creating, setCreating] = useState(false);

  const params = status ? { status: status as PurchaseOrderStatus } : {};
  const { data: orders, isLoading } = usePurchaseOrdersControllerList(params);
  const { data: suppliers } = useSuppliersControllerList();
  const { data: warehouses } = useWarehousesControllerList();
  const { data: products } = useProductsControllerList();

  const queryClient = useQueryClient();
  const list = orders ?? [];

  const invalidate = async (): Promise<void> => {
    await queryClient.invalidateQueries({
      queryKey: getPurchaseOrdersControllerListQueryKey(params),
    });
  };

  return (
    <div className="flex flex-col gap-4">
      <PageHead
        title="Purchase Orders"
        actions={<Button onClick={() => setCreating(true)}>New PO</Button>}
      />

      <div className="flex flex-wrap items-center gap-3">
        <select
          aria-label="Filter by status"
          value={status}
          onChange={(e) => setStatus(e.target.value)}
          className="h-9 rounded-md border border-input bg-background px-3 text-sm"
        >
          <option value="">All statuses</option>
          {Object.values(PurchaseOrderStatus).map((s) => (
            <option key={s} value={s}>{s.replace(/_/g, ' ')}</option>
          ))}
        </select>
      </div>

      {isLoading ? (
        <div className="flex flex-col gap-2">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-12 w-full" />
          ))}
        </div>
      ) : list.length === 0 ? (
        <EmptyState
          title={status ? 'No matches' : 'No purchase orders'}
          description={status ? 'No POs in this status.' : 'Raise a purchase order to bring stock in.'}
          action={<Button onClick={() => setCreating(true)}>New PO</Button>}
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
                <TableHead className="text-right">Lines</TableHead>
                <TableHead className="text-right">Total</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {list.map((po: PurchaseOrderDto) => (
                <TableRow key={po.id}>
                  <TableCell className="font-mono text-xs font-semibold">{po.code}</TableCell>
                  <TableCell>{po.supplierName}</TableCell>
                  <TableCell>{po.warehouseName}</TableCell>
                  <TableCell><StatusBadge tone={PO_STATUS_TONE[po.status]}>{po.status.replace(/_/g, ' ')}</StatusBadge></TableCell>
                  <TableCell className="text-right tabular-nums">{po.lines.length}</TableCell>
                  <TableCell className="text-right font-mono tabular-nums">{po.totalCost}</TableCell>
                  <TableCell className="text-right">
                    <Link href={`/purchase-orders/${po.id}`} className={buttonVariants({ variant: 'outline', size: 'sm' })}>
                      View
                    </Link>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      {creating && (
        <CreatePoDialog
          suppliers={suppliers ?? []}
          warehouses={warehouses ?? []}
          products={products ?? []}
          onClose={() => setCreating(false)}
          onSuccess={invalidate}
        />
      )}
    </div>
  );
}
