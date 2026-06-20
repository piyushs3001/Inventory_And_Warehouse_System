'use client';

import Link from 'next/link';
import { useStockCountsControllerList } from '@iws/api-client';
import type { StockCountDto } from '@iws/api-client';
import {
  buttonVariants,
  PageHead,
  StatusBadge,
  EmptyState,
  Skeleton,
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@iws/ui';
import { COUNT_STATUS_TONE } from './count-status';

// Staff enter physical counts on open sessions; sessions are opened and
// reconciled by managers/admins.
export default function StaffCountingPage() {
  const { data: counts, isLoading } = useStockCountsControllerList({});
  const list = counts ?? [];

  return (
    <div className="flex flex-col gap-4">
      <PageHead title="Stock Count" />
      <p className="text-sm text-muted-foreground -mt-2">
        Open count sessions for your warehouse(s). Enter physical quantities; a manager reconciles.
      </p>

      {isLoading ? (
        <div className="flex flex-col gap-2">{Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-12 w-full" />)}</div>
      ) : list.length === 0 ? (
        <EmptyState title="No count sessions" description="No stock counts are open for your warehouses." />
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
    </div>
  );
}
