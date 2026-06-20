'use client';

import { useState } from 'react';
import { useActivityControllerList } from '@iws/api-client';
import type { ActivityLogDto } from '@iws/api-client';
import { PageHead, Input, EmptyState, DataTable, type DataTableColumn } from '@iws/ui';

// The log can be long; pull a generous server page (filtered server-side by the
// toolbar controls below), then let DataTable handle in-memory search + paging.
const FETCH_SIZE = 500;

export default function ActivityLogPage() {
  const [action, setAction] = useState('');
  const [entityType, setEntityType] = useState('');
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');

  const params = {
    ...(action ? { action } : {}),
    ...(entityType ? { entityType } : {}),
    ...(from ? { from: new Date(from).toISOString() } : {}),
    ...(to ? { to: new Date(to).toISOString() } : {}),
    page: 1,
    pageSize: FETCH_SIZE,
  };
  const { data, isLoading } = useActivityControllerList(params);
  const rows = data?.data ?? [];

  const columns: DataTableColumn<ActivityLogDto>[] = [
    {
      key: 'when',
      header: 'When',
      className: 'whitespace-nowrap text-xs text-muted-foreground',
      cell: (r) => new Date(r.createdAt).toLocaleString(),
      sortValue: (r) => r.createdAt,
    },
    {
      key: 'user',
      header: 'User',
      className: 'text-sm',
      cell: (r) => r.userName ?? '—',
      sortValue: (r) => r.userName ?? '',
    },
    {
      key: 'action',
      header: 'Action',
      className: 'font-mono text-xs',
      cell: (r) => r.action,
      sortValue: (r) => r.action,
    },
    {
      key: 'entity',
      header: 'Entity',
      className: 'text-sm',
      cell: (r) => r.entityType,
      sortValue: (r) => r.entityType,
    },
    {
      key: 'summary',
      header: 'Summary',
      className: 'text-sm text-muted-foreground',
      cell: (r) => r.summary,
    },
  ];

  return (
    <div className="flex flex-col gap-4">
      <PageHead title="Activity Log" description="Append-only audit of every meaningful action. Read-only." />

      <DataTable
        rows={rows}
        getRowKey={(r) => r.id}
        isLoading={isLoading}
        pageSize={20}
        searchPlaceholder="Search user, action, entity…"
        searchFilter={(r, q) =>
          (r.userName ?? '').toLowerCase().includes(q) ||
          r.action.toLowerCase().includes(q) ||
          r.entityType.toLowerCase().includes(q) ||
          r.summary.toLowerCase().includes(q)
        }
        toolbar={
          <>
            <Input
              aria-label="Filter by action"
              placeholder="Action (e.g. PO_APPROVE)"
              value={action}
              onChange={(e) => setAction(e.target.value)}
              className="max-w-[14rem]"
            />
            <Input
              aria-label="Filter by entity type"
              placeholder="Entity (e.g. PurchaseOrder)"
              value={entityType}
              onChange={(e) => setEntityType(e.target.value)}
              className="max-w-[14rem]"
            />
            <label className="flex items-center gap-1.5 text-sm text-muted-foreground">
              From
              <input
                type="date"
                value={from}
                onChange={(e) => setFrom(e.target.value)}
                className="h-9 rounded-md border border-input bg-background px-2 text-sm"
              />
            </label>
            <label className="flex items-center gap-1.5 text-sm text-muted-foreground">
              To
              <input
                type="date"
                value={to}
                onChange={(e) => setTo(e.target.value)}
                className="h-9 rounded-md border border-input bg-background px-2 text-sm"
              />
            </label>
          </>
        }
        empty={<EmptyState title="No activity" description="No log entries match the current filters." />}
        columns={columns}
      />
    </div>
  );
}
