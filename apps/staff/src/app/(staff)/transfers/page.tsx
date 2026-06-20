'use client';

import { useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import {
  useTransfersControllerList,
  getTransfersControllerListQueryKey,
  useTransfersControllerReceive,
  useWarehousesControllerList,
  useProductsControllerList,
  StockTransferStatus,
} from '@iws/api-client';
import type { TransferDto } from '@iws/api-client';
import {
  Button,
  PageHead,
  StatusBadge,
  EmptyState,
  Skeleton,
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@iws/ui';
import { RequestTransferDialog } from './request-transfer-dialog';
import { TRANSFER_STATUS_TONE } from './transfer-status';

// Staff can request transfers and receive approved ones. Approval/cancel are
// manager/admin only (server-enforced) and not surfaced here.
export default function StaffTransfersPage() {
  const [requesting, setRequesting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const params = {};
  const { data: transfers, isLoading } = useTransfersControllerList(params);
  const { data: warehouses } = useWarehousesControllerList();
  const { data: products } = useProductsControllerList();
  const receive = useTransfersControllerReceive();
  const queryClient = useQueryClient();
  const list = transfers ?? [];

  const invalidate = async (): Promise<void> => {
    await queryClient.invalidateQueries({ queryKey: getTransfersControllerListQueryKey(params) });
  };

  const onReceive = async (id: string): Promise<void> => {
    setError(null);
    try {
      await receive.mutateAsync({ id });
      await invalidate();
    } catch (err) {
      const m = (err as { response?: { data?: { message?: string } } })?.response?.data?.message;
      setError(typeof m === 'string' ? m : 'Could not receive transfer');
    }
  };

  return (
    <div className="flex flex-col gap-4">
      <PageHead title="Stock Transfers" actions={<Button onClick={() => setRequesting(true)}>Request transfer</Button>} />

      {error && <p role="alert" className="text-sm text-red-600">{error}</p>}

      {isLoading ? (
        <div className="flex flex-col gap-2">{Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-12 w-full" />)}</div>
      ) : list.length === 0 ? (
        <EmptyState title="No transfers" description="Request a transfer to move stock between warehouses." action={<Button onClick={() => setRequesting(true)}>Request transfer</Button>} />
      ) : (
        <div className="rounded-xl bg-card ring-1 ring-foreground/10 overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Code</TableHead>
                <TableHead>From</TableHead>
                <TableHead>To</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Lines</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {list.map((t: TransferDto) => (
                <TableRow key={t.id}>
                  <TableCell className="font-mono text-xs font-semibold">{t.code}</TableCell>
                  <TableCell>{t.sourceWarehouseName}</TableCell>
                  <TableCell>{t.destinationWarehouseName}</TableCell>
                  <TableCell><StatusBadge tone={TRANSFER_STATUS_TONE[t.status]}>{t.status.replace(/_/g, ' ')}</StatusBadge></TableCell>
                  <TableCell className="text-right tabular-nums">{t.lines.length}</TableCell>
                  <TableCell className="text-right">
                    {t.status === StockTransferStatus.APPROVED ? (
                      <Button size="sm" disabled={receive.isPending} onClick={() => onReceive(t.id)}>Receive</Button>
                    ) : (
                      <span className="text-xs text-muted-foreground">
                        {t.status === StockTransferStatus.REQUESTED ? 'Awaiting approval' : '—'}
                      </span>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      {requesting && (
        <RequestTransferDialog warehouses={warehouses ?? []} products={products ?? []}
          onClose={() => setRequesting(false)} onSuccess={invalidate} />
      )}
    </div>
  );
}
