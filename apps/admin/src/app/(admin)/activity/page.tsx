'use client';

import { useState } from 'react';
import { useActivityControllerList } from '@iws/api-client';
import {
  PageHead, Input, Button, Skeleton, EmptyState,
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@iws/ui';

const PAGE_SIZE = 20;

export default function ActivityLogPage() {
  const [action, setAction] = useState('');
  const [entityType, setEntityType] = useState('');
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [page, setPage] = useState(1);

  const params = {
    ...(action ? { action } : {}),
    ...(entityType ? { entityType } : {}),
    ...(from ? { from: new Date(from).toISOString() } : {}),
    ...(to ? { to: new Date(to).toISOString() } : {}),
    page,
    pageSize: PAGE_SIZE,
  };
  const { data, isLoading } = useActivityControllerList(params);
  const rows = data?.data ?? [];
  const total = data?.total ?? 0;
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  const reset = (fn: () => void) => { fn(); setPage(1); };

  return (
    <div className="flex flex-col gap-4">
      <PageHead title="Activity Log" description="Append-only audit of every meaningful action. Read-only." />

      <div className="flex flex-wrap items-center gap-3">
        <Input
          aria-label="Filter by action"
          placeholder="Action (e.g. PO_APPROVE)"
          value={action}
          onChange={(e) => reset(() => setAction(e.target.value))}
          className="max-w-[14rem]"
        />
        <Input
          aria-label="Filter by entity type"
          placeholder="Entity (e.g. PurchaseOrder)"
          value={entityType}
          onChange={(e) => reset(() => setEntityType(e.target.value))}
          className="max-w-[14rem]"
        />
        <label className="flex items-center gap-1.5 text-sm text-muted-foreground">
          From
          <input type="date" value={from} onChange={(e) => reset(() => setFrom(e.target.value))}
            className="h-9 rounded-md border border-input bg-background px-2 text-sm" />
        </label>
        <label className="flex items-center gap-1.5 text-sm text-muted-foreground">
          To
          <input type="date" value={to} onChange={(e) => reset(() => setTo(e.target.value))}
            className="h-9 rounded-md border border-input bg-background px-2 text-sm" />
        </label>
      </div>

      {isLoading ? (
        <div className="flex flex-col gap-2">
          {Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-11 w-full" />)}
        </div>
      ) : rows.length === 0 ? (
        <EmptyState title="No activity" description="No log entries match the current filters." />
      ) : (
        <>
          <div className="rounded-xl bg-card ring-1 ring-foreground/10 overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>When</TableHead>
                  <TableHead>User</TableHead>
                  <TableHead>Action</TableHead>
                  <TableHead>Entity</TableHead>
                  <TableHead>Summary</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.map((r) => (
                  <TableRow key={r.id}>
                    <TableCell className="whitespace-nowrap text-xs text-muted-foreground">
                      {new Date(r.createdAt).toLocaleString()}
                    </TableCell>
                    <TableCell className="text-sm">{r.userName ?? '—'}</TableCell>
                    <TableCell className="font-mono text-xs">{r.action}</TableCell>
                    <TableCell className="text-sm">{r.entityType}</TableCell>
                    <TableCell className="text-sm text-muted-foreground">{r.summary}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
          <div className="flex items-center justify-between text-sm text-muted-foreground">
            <span>{total} entr{total === 1 ? 'y' : 'ies'}</span>
            <div className="flex items-center gap-3">
              <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>Previous</Button>
              <span>Page {page} of {totalPages}</span>
              <Button variant="outline" size="sm" disabled={page >= totalPages} onClick={() => setPage((p) => p + 1)}>Next</Button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
