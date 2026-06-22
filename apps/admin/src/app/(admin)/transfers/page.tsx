'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useQueryClient } from '@tanstack/react-query';
import {
  useTransfersControllerList,
  getTransfersControllerListQueryKey,
  useTransfersControllerApprove,
  useTransfersControllerCancel,
  useTransfersControllerReceive,
  StockTransferStatus,
} from '@iws/api-client';
import type { TransferDto } from '@iws/api-client';
import { toast } from 'sonner';
import {
  Button,
  buttonVariants,
  PageHead,
  StatusBadge,
  EmptyState,
  DataTable,
  SimpleSelect,
  RowActions,
  useConfirm,
  type DataTableColumn,
} from '@iws/ui';
import { TRANSFER_STATUS_TONE } from './transfer-status';

export default function TransfersPage() {
  const confirm = useConfirm();
  const [status, setStatus] = useState('');

  const params = status ? { status: status as StockTransferStatus } : {};
  const { data: transfers, isLoading } = useTransfersControllerList(params);

  const approve = useTransfersControllerApprove();
  const cancel = useTransfersControllerCancel();
  const receive = useTransfersControllerReceive();
  const queryClient = useQueryClient();
  const list = transfers ?? [];
  const pending = approve.isPending || cancel.isPending || receive.isPending;

  const invalidate = async (): Promise<void> => {
    await queryClient.invalidateQueries({ queryKey: getTransfersControllerListQueryKey(params) });
  };

  const act = async (fn: () => Promise<unknown>, successMsg: string): Promise<void> => {
    try {
      await fn();
      await invalidate();
      toast.success(successMsg);
    } catch (err) {
      const m = (err as { response?: { data?: { message?: string } } })?.response?.data?.message;
      toast.error(typeof m === 'string' ? m : 'Action failed');
    }
  };

  const onCancel = async (t: TransferDto): Promise<void> => {
    const ok = await confirm({
      title: 'Cancel transfer?',
      description: `Transfer ${t.code} will be cancelled and cannot be approved or received.`,
      confirmLabel: 'Cancel transfer',
      tone: 'danger',
    });
    if (!ok) return;
    await act(() => cancel.mutateAsync({ id: t.id }), 'Transfer cancelled');
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
        <div className="flex items-center justify-end gap-2">
          {t.status === StockTransferStatus.REQUESTED && (
            <Button size="sm" disabled={pending} onClick={() => act(() => approve.mutateAsync({ id: t.id }), 'Transfer approved')}>Approve</Button>
          )}
          {t.status === StockTransferStatus.APPROVED && (
            <Button size="sm" disabled={pending} onClick={() => act(() => receive.mutateAsync({ id: t.id }), 'Transfer received')}>Receive</Button>
          )}
          <RowActions
            onDelete={
              t.status === StockTransferStatus.REQUESTED || t.status === StockTransferStatus.APPROVED
                ? () => onCancel(t)
                : undefined
            }
            labels={{ delete: 'Cancel' }}
            deleteDisabled={pending}
          />
        </div>
      ),
    },
  ];

  return (
    <div className="flex flex-col gap-4">
      <PageHead
        title="Stock Transfers"
        actions={<Link className={buttonVariants()} href="/transfers/new">New transfer</Link>}
      />

      <DataTable
        rows={list}
        getRowKey={(t) => t.id}
        isLoading={isLoading}
        searchPlaceholder="Search by code…"
        searchFilter={(t, q) => t.code.toLowerCase().includes(q)}
        toolbar={
          <SimpleSelect
            aria-label="Filter by status"
            className="w-48"
            value={status}
            onValueChange={setStatus}
            options={[
              { value: '', label: 'All statuses' },
              ...Object.values(StockTransferStatus).map((s) => ({
                value: s,
                label: s.replace(/_/g, ' '),
              })),
            ]}
          />
        }
        empty={
          <EmptyState
            title={status ? 'No matches' : 'No transfers'}
            description={status ? 'No transfers in this status.' : 'Move stock between warehouses with a transfer.'}
            action={<Link className={buttonVariants()} href="/transfers/new">New transfer</Link>}
          />
        }
        columns={columns}
      />
    </div>
  );
}
