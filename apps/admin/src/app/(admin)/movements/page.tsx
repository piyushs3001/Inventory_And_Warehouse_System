'use client';

import { useState } from 'react';
import {
  useMovementsControllerList,
  useWarehousesControllerList,
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

export default function MovementsPage() {
  const [type, setType] = useState('');
  const [warehouseId, setWarehouseId] = useState('');
  const [productId, setProductId] = useState('');
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [page, setPage] = useState(1);

  const params = {
    ...(type ? { type: type as MovementType } : {}),
    ...(warehouseId ? { warehouseId } : {}),
    ...(productId ? { productId } : {}),
    ...(from ? { from: new Date(from).toISOString() } : {}),
    ...(to ? { to: new Date(to).toISOString() } : {}),
    page,
    pageSize: PAGE_SIZE,
  };

  const { data, isLoading } = useMovementsControllerList(params);
  const { data: warehouses } = useWarehousesControllerList();
  const { data: products } = useProductsControllerList();

  const rows = data?.data ?? [];
  const total = data?.total ?? 0;
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  const resetTo1 = <T,>(setter: (v: T) => void) => (v: T) => { setter(v); setPage(1); };

  return (
    <div className="flex flex-col gap-4">
      <PageHead title="Movements" />
      <p className="text-sm text-muted-foreground -mt-2">
        Append-only ledger of every stock quantity change. Read-only.
      </p>

      <div className="flex flex-wrap items-center gap-3">
        <select
          aria-label="Filter by type"
          value={type}
          onChange={(e) => resetTo1(setType)(e.target.value)}
          className="h-9 rounded-md border border-input bg-background px-3 text-sm"
        >
          <option value="">All types</option>
          {Object.values(MovementType).map((t) => (
            <option key={t} value={t}>{t}</option>
          ))}
        </select>
        <select
          aria-label="Filter by warehouse"
          value={warehouseId}
          onChange={(e) => resetTo1(setWarehouseId)(e.target.value)}
          className="h-9 rounded-md border border-input bg-background px-3 text-sm"
        >
          <option value="">All warehouses</option>
          {(warehouses ?? []).map((w) => (
            <option key={w.id} value={w.id}>{w.name}</option>
          ))}
        </select>
        <select
          aria-label="Filter by product"
          value={productId}
          onChange={(e) => resetTo1(setProductId)(e.target.value)}
          className="h-9 rounded-md border border-input bg-background px-3 text-sm"
        >
          <option value="">All products</option>
          {(products ?? []).map((p) => (
            <option key={p.id} value={p.id}>{p.name}</option>
          ))}
        </select>
        <label className="flex items-center gap-1.5 text-sm text-muted-foreground">
          From
          <input type="date" value={from} onChange={(e) => resetTo1(setFrom)(e.target.value)}
            className="h-9 rounded-md border border-input bg-background px-2 text-sm" />
        </label>
        <label className="flex items-center gap-1.5 text-sm text-muted-foreground">
          To
          <input type="date" value={to} onChange={(e) => resetTo1(setTo)(e.target.value)}
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
                  <TableHead>By</TableHead>
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
                    <TableCell className="text-sm">{m.userName ?? '—'}</TableCell>
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
