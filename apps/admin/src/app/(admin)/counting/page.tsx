'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useQueryClient } from '@tanstack/react-query';
import {
  useStockCountsControllerList,
  getStockCountsControllerListQueryKey,
  useWarehousesControllerList,
  StockCountStatus,
} from '@iws/api-client';
import type { StockCountDto } from '@iws/api-client';
import {
  Button,
  buttonVariants,
  PageHead,
  StatusBadge,
  EmptyState,
  Skeleton,
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@iws/ui';
import { CreateCountDialog } from './create-count-dialog';
import { COUNT_STATUS_TONE } from './count-status';

export default function CountingPage() {
  const [status, setStatus] = useState('');
  const [creating, setCreating] = useState(false);
  const router = useRouter();

  const params = status ? { status: status as StockCountStatus } : {};
  const { data: counts, isLoading } = useStockCountsControllerList(params);
  const { data: warehouses } = useWarehousesControllerList();
  const queryClient = useQueryClient();
  const list = counts ?? [];

  const invalidate = async (): Promise<void> => {
    await queryClient.invalidateQueries({ queryKey: getStockCountsControllerListQueryKey(params) });
  };

  return (
    <div className="flex flex-col gap-4">
      <PageHead title="Stock Counting" actions={<Button onClick={() => setCreating(true)}>New count</Button>} />

      <div className="flex flex-wrap items-center gap-3">
        <select aria-label="Filter by status" value={status} onChange={(e) => setStatus(e.target.value)}
          className="h-9 rounded-md border border-input bg-background px-3 text-sm">
          <option value="">All statuses</option>
          {Object.values(StockCountStatus).map((s) => <option key={s} value={s}>{s}</option>)}
        </select>
      </div>

      {isLoading ? (
        <div className="flex flex-col gap-2">{Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-12 w-full" />)}</div>
      ) : list.length === 0 ? (
        <EmptyState title={status ? 'No matches' : 'No counts'} description={status ? 'No counts in this status.' : 'Open a count session to reconcile physical stock.'}
          action={<Button onClick={() => setCreating(true)}>New count</Button>} />
      ) : (
        <div className="rounded-xl bg-card ring-1 ring-foreground/10 overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Code</TableHead>
                <TableHead>Warehouse</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Lines</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {list.map((c: StockCountDto) => (
                <TableRow key={c.id}>
                  <TableCell className="font-mono text-xs font-semibold">{c.code}</TableCell>
                  <TableCell>{c.warehouseName}</TableCell>
                  <TableCell><StatusBadge tone={COUNT_STATUS_TONE[c.status]}>{c.status}</StatusBadge></TableCell>
                  <TableCell className="text-right tabular-nums">{c.lines.length}</TableCell>
                  <TableCell className="text-right">
                    <Link href={`/counting/${c.id}`} className={buttonVariants({ variant: 'outline', size: 'sm' })}>Open</Link>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      {creating && (
        <CreateCountDialog warehouses={warehouses ?? []} onClose={() => setCreating(false)}
          onSuccess={async (id) => { await invalidate(); router.push(`/counting/${id}`); }} />
      )}
    </div>
  );
}
