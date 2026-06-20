'use client';

import { useState } from 'react';
import {
  useMovementsControllerList,
  useProductsControllerList,
  MovementType,
} from '@iws/api-client';
import type { StockMovementDto } from '@iws/api-client';
import {
  PageHead,
  StatusBadge,
  EmptyState,
  Skeleton,
  Button,
  SimpleSelect,
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@iws/ui';

const PAGE_SIZE = 20;

const TYPE_TONE: Record<MovementType, 'ok' | 'transit' | 'warn' | 'reserved' | 'danger'> = {
  [MovementType.RECEIVE]: 'ok',
  [MovementType.TRANSFER]: 'transit',
  [MovementType.ADJUSTMENT]: 'warn',
  [MovementType.SALE]: 'reserved',
  [MovementType.RETURN]: 'danger',
};

function deltaSummary(m: StockMovementDto): string {
  const parts: string[] = [];
  const add = (label: string, v: number) => {
    if (v !== 0) parts.push(`${label} ${v > 0 ? '+' : ''}${v}`);
  };
  add('Avail', m.availableDelta);
  add('Resv', m.reservedDelta);
  add('Dmg', m.damagedDelta);
  add('Transit', m.inTransitDelta);
  return parts.length ? parts.join(', ') : '—';
}

// Read-only movement history, scope-filtered server-side to the staff member's
// assigned warehouses.
export default function MovementHistoryPage() {
  const [type, setType] = useState('');
  const [productId, setProductId] = useState('');
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [page, setPage] = useState(1);

  const params = {
    ...(type ? { type: type as MovementType } : {}),
    ...(productId ? { productId } : {}),
    ...(from ? { from: new Date(from).toISOString() } : {}),
    ...(to ? { to: new Date(to).toISOString() } : {}),
    page,
    pageSize: PAGE_SIZE,
  };

  const { data, isLoading } = useMovementsControllerList(params);
  const { data: products } = useProductsControllerList();

  const rows = data?.data ?? [];
  const total = data?.total ?? 0;
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  const reset = (fn: () => void) => { fn(); setPage(1); };

  return (
    <div className="flex flex-col gap-4">
      <PageHead title="Movement History" />

      <div className="flex flex-wrap items-center gap-3">
        <SimpleSelect
          aria-label="Filter by type"
          className="w-44"
          value={type}
          onValueChange={(v) => reset(() => setType(v))}
          options={[
            { value: '', label: 'All types' },
            ...Object.values(MovementType).map((t) => ({ value: t, label: t })),
          ]}
        />
        <SimpleSelect
          aria-label="Filter by product"
          className="w-48"
          value={productId}
          onValueChange={(v) => reset(() => setProductId(v))}
          options={[
            { value: '', label: 'All products' },
            ...(products ?? []).map((p) => ({ value: p.id, label: p.name })),
          ]}
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
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-12 w-full" />
          ))}
        </div>
      ) : rows.length === 0 ? (
        <EmptyState title="No movements" description="No stock movements match the current filters." />
      ) : (
        <>
          <div className="rounded-xl bg-card ring-1 ring-foreground/10 overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>When</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Product</TableHead>
                  <TableHead>Warehouse</TableHead>
                  <TableHead>Change</TableHead>
                  <TableHead className="text-right">Before</TableHead>
                  <TableHead className="text-right">After</TableHead>
                  <TableHead>Reason</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.map((m: StockMovementDto) => (
                  <TableRow key={m.id}>
                    <TableCell className="whitespace-nowrap text-xs text-muted-foreground">
                      {new Date(m.createdAt).toLocaleString()}
                    </TableCell>
                    <TableCell><StatusBadge tone={TYPE_TONE[m.type]}>{m.type}</StatusBadge></TableCell>
                    <TableCell>
                      <div className="text-[13px] font-semibold">{m.productName}</div>
                      <div className="font-mono text-xs text-muted-foreground">{m.sku}</div>
                    </TableCell>
                    <TableCell>{m.warehouseName}</TableCell>
                    <TableCell className="font-mono text-xs tabular-nums">{deltaSummary(m)}</TableCell>
                    <TableCell className="text-right tabular-nums">{m.beforeQty}</TableCell>
                    <TableCell className="text-right tabular-nums">{m.afterQty}</TableCell>
                    <TableCell className="max-w-[16rem] truncate text-sm text-muted-foreground" title={m.reason ?? ''}>
                      {m.reason ?? '—'}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

          <div className="flex items-center justify-between text-sm text-muted-foreground">
            <span>{total} movement{total === 1 ? '' : 's'}</span>
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
