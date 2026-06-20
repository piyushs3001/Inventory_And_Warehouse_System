'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useQueryClient } from '@tanstack/react-query';
import {
  useTransfersControllerList,
  getTransfersControllerListQueryKey,
  useTransfersControllerReceive,
  StockTransferStatus,
} from '@iws/api-client';
import type { TransferDto } from '@iws/api-client';
import {
  Button,
  buttonVariants,
  PageHead,
  StatusBadge,
  EmptyState,
  DataTable,
  type DataTableColumn,
} from '@iws/ui';
import { TRANSFER_STATUS_TONE } from './transfer-status';

// Staff can request transfers and receive approved ones. Approval/cancel are
// manager/admin only (server-enforced) and not surfaced here.
export default function StaffTransfersPage() {
  const [status, setStatus] = useState('');
  const [error, setError] = useState<string | null>(null);

  const params = status ? { status: status as StockTransferStatus } : {};
  const { data: transfers, isLoading } = useTransfersControllerList(params);

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

  const columns: DataTableColumn<TransferDto>[] = [
    {
      key: 'code',
      header: 'Code',
      cell: (t) => <span className="font-mono text-xs font-semibold">{t.code}</span>,
      sortValue: (t) => t.code,
    },
    {
      key: 'from',
      header: 'From',
      cell: (t) => t.sourceWarehouseName,
      sortValue: (t) => t.sourceWarehouseName,
    },
    {
      key: 'to',
      header: 'To',
      cell: (t) => t.destinationWarehouseName,
      sortValue: (t) => t.destinationWarehouseName,
    },
    {
      key: 'status',
      header: 'Status',
      cell: (t) => (
        <StatusBadge tone={TRANSFER_STATUS_TONE[t.status]}>{t.status.replace(/_/g, ' ')}</StatusBadge>
      ),
      sortValue: (t) => t.status,
    },
    {
      key: 'lines',
      header: 'Lines',
      align: 'right',
      cell: (t) => <span className="tabular-nums">{t.lines.length}</span>,
      sortValue: (t) => t.lines.length,
    },
    {
      key: 'actions',
      header: 'Actions',
      align: 'right',
      cell: (t) => (
        <div className="flex justify-end gap-2">
          {t.status === StockTransferStatus.APPROVED ? (
            <Button size="sm" disabled={receive.isPending} onClick={() => onReceive(t.id)}>Receive</Button>
          ) : (
            <span className="text-xs text-muted-foreground">
              {t.status === StockTransferStatus.REQUESTED ? 'Awaiting approval' : '—'}
            </span>
          )}
        </div>
      ),
    },
  ];

  return (
    <div className="flex flex-col gap-4">
      <PageHead
        title="Stock Transfers"
        actions={<Link className={buttonVariants()} href="/transfers/new">Request transfer</Link>}
      />

      {error && <p role="alert" className="text-sm text-red-600">{error}</p>}

      <DataTable
        rows={list}
        getRowKey={(t) => t.id}
        isLoading={isLoading}
        searchPlaceholder="Search by code…"
        searchFilter={(t, q) => t.code.toLowerCase().includes(q)}
        toolbar={
          <select aria-label="Filter by status" value={status} onChange={(e) => setStatus(e.target.value)}
            className="h-9 rounded-md border border-input bg-background px-3 text-sm">
            <option value="">All statuses</option>
            {Object.values(StockTransferStatus).map((s) => <option key={s} value={s}>{s.replace(/_/g, ' ')}</option>)}
          </select>
        }
        empty={
          <EmptyState
            title={status ? 'No matches' : 'No transfers'}
            description={status ? 'No transfers in this status.' : 'Request a transfer to move stock between warehouses.'}
            action={<Link className={buttonVariants()} href="/transfers/new">Request transfer</Link>}
          />
        }
        columns={columns}
      />
    </div>
  );
}
