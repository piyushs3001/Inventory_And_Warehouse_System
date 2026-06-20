'use client';

import { useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import {
  useTransfersControllerList,
  getTransfersControllerListQueryKey,
  useTransfersControllerApprove,
  useTransfersControllerCancel,
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
import { CreateTransferDialog } from './create-transfer-dialog';
import { TRANSFER_STATUS_TONE } from './transfer-status';

export default function TransfersPage() {
  const [status, setStatus] = useState('');
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const params = status ? { status: status as StockTransferStatus } : {};
  const { data: transfers, isLoading } = useTransfersControllerList(params);
  const { data: warehouses } = useWarehousesControllerList();
  const { data: products } = useProductsControllerList();

  const approve = useTransfersControllerApprove();
  const cancel = useTransfersControllerCancel();
  const receive = useTransfersControllerReceive();
  const queryClient = useQueryClient();
  const list = transfers ?? [];
  const pending = approve.isPending || cancel.isPending || receive.isPending;

  const invalidate = async (): Promise<void> => {
    await queryClient.invalidateQueries({ queryKey: getTransfersControllerListQueryKey(params) });
  };

  const act = async (fn: () => Promise<unknown>): Promise<void> => {
    setError(null);
    try {
      await fn();
      await invalidate();
    } catch (err) {
      const m = (err as { response?: { data?: { message?: string } } })?.response?.data?.message;
      setError(typeof m === 'string' ? m : 'Action failed');
    }
  };

  return (
    <div className="flex flex-col gap-4">
      <PageHead title="Stock Transfers" actions={<Button onClick={() => setCreating(true)}>New transfer</Button>} />

      <div className="flex flex-wrap items-center gap-3">
        <select aria-label="Filter by status" value={status} onChange={(e) => setStatus(e.target.value)}
          className="h-9 rounded-md border border-input bg-background px-3 text-sm">
          <option value="">All statuses</option>
          {Object.values(StockTransferStatus).map((s) => <option key={s} value={s}>{s.replace(/_/g, ' ')}</option>)}
        </select>
      </div>

      {error && <p role="alert" className="text-sm text-red-600">{error}</p>}

      {isLoading ? (
        <div className="flex flex-col gap-2">{Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-12 w-full" />)}</div>
      ) : list.length === 0 ? (
        <EmptyState title={status ? 'No matches' : 'No transfers'} description={status ? 'No transfers in this status.' : 'Move stock between warehouses with a transfer.'}
          action={<Button onClick={() => setCreating(true)}>New transfer</Button>} />
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
                  <TableCell className="space-x-2 text-right">
                    {t.status === StockTransferStatus.REQUESTED && (
                      <Button size="sm" disabled={pending} onClick={() => act(() => approve.mutateAsync({ id: t.id }))}>Approve</Button>
                    )}
                    {t.status === StockTransferStatus.APPROVED && (
                      <Button size="sm" disabled={pending} onClick={() => act(() => receive.mutateAsync({ id: t.id }))}>Receive</Button>
                    )}
                    {(t.status === StockTransferStatus.REQUESTED || t.status === StockTransferStatus.APPROVED) && (
                      <Button size="sm" variant="outline" disabled={pending} onClick={() => act(() => cancel.mutateAsync({ id: t.id }))}>Cancel</Button>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      {creating && (
        <CreateTransferDialog warehouses={warehouses ?? []} products={products ?? []}
          onClose={() => setCreating(false)} onSuccess={invalidate} />
      )}
    </div>
  );
}
