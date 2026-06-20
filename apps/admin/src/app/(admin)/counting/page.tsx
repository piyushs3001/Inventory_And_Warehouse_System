'use client';

import { useState } from 'react';
import Link from 'next/link';
import {
  useStockCountsControllerList,
  StockCountStatus,
} from '@iws/api-client';
import type { StockCountDto } from '@iws/api-client';
import {
  buttonVariants,
  PageHead,
  StatusBadge,
  EmptyState,
  DataTable,
  SimpleSelect,
  type DataTableColumn,
} from '@iws/ui';
import { COUNT_STATUS_TONE } from './count-status';

const columns: DataTableColumn<StockCountDto>[] = [
  {
    key: 'code',
    header: 'Code',
    cell: (c) => <span className="font-mono text-xs font-semibold">{c.code}</span>,
    sortValue: (c) => c.code,
  },
  {
    key: 'warehouse',
    header: 'Warehouse',
    cell: (c) => c.warehouseName,
    sortValue: (c) => c.warehouseName,
  },
  {
    key: 'status',
    header: 'Status',
    cell: (c) => <StatusBadge tone={COUNT_STATUS_TONE[c.status]}>{c.status}</StatusBadge>,
    sortValue: (c) => c.status,
  },
  {
    key: 'lines',
    header: 'Lines',
    align: 'right',
    cell: (c) => <span className="tabular-nums">{c.lines.length}</span>,
    sortValue: (c) => c.lines.length,
  },
  {
    key: 'actions',
    header: 'Actions',
    align: 'right',
    cell: (c) => (
      <div className="flex justify-end gap-2">
        <Link href={`/counting/${c.id}`} className={buttonVariants({ variant: 'outline', size: 'sm' })}>Open</Link>
      </div>
    ),
  },
];

export default function CountingPage() {
  const [status, setStatus] = useState('');

  const params = status ? { status: status as StockCountStatus } : {};
  const { data: counts, isLoading } = useStockCountsControllerList(params);
  const list = counts ?? [];

  return (
    <div className="flex flex-col gap-4">
      <PageHead
        title="Stock Counting"
        actions={<Link href="/counting/new" className={buttonVariants()}>New count</Link>}
      />

      <DataTable
        rows={list}
        getRowKey={(c) => c.id}
        isLoading={isLoading}
        columns={columns}
        searchPlaceholder="Search by code…"
        searchFilter={(c, q) => c.code.toLowerCase().includes(q)}
        toolbar={
          <SimpleSelect
            aria-label="Filter by status"
            className="w-48"
            value={status}
            onValueChange={setStatus}
            options={[
              { value: '', label: 'All statuses' },
              ...Object.values(StockCountStatus).map((s) => ({ value: s, label: s })),
            ]}
          />
        }
        empty={
          <EmptyState
            title={status ? 'No matches' : 'No counts'}
            description={status ? 'No counts in this status.' : 'Open a count session to reconcile physical stock.'}
            action={<Link href="/counting/new" className={buttonVariants()}>New count</Link>}
          />
        }
      />
    </div>
  );
}
