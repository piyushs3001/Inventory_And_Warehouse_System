'use client';

import { useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import {
  useInventoryControllerList,
  getInventoryControllerListQueryKey,
  useWarehousesControllerList,
} from '@iws/api-client';
import type { InventoryItemDto } from '@iws/api-client';
import {
  Button,
  PageHead,
  StatusBadge,
  EmptyState,
  Skeleton,
  Input,
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
  EntityAvatar,
} from '@iws/ui';
import { ReserveStockDialog, type ReserveContext } from './reserve-stock-dialog';

const PAGE_SIZE = 20;

// Staff inventory is read-only EXCEPT reserving stock (available -> reserved),
// which staff are permitted to do. Adjustments are manager/admin only and are
// not offered here. The list is scope-filtered server-side to the staff
// member's assigned warehouses.
export default function ViewInventoryPage() {
  const [search, setSearch] = useState('');
  const [warehouseId, setWarehouseId] = useState('');
  const [lowStock, setLowStock] = useState(false);
  const [page, setPage] = useState(1);

  const params = {
    ...(search ? { search } : {}),
    ...(warehouseId ? { warehouseId } : {}),
    ...(lowStock ? { lowStock: true } : {}),
    page,
    pageSize: PAGE_SIZE,
  };

  const { data, isLoading } = useInventoryControllerList(params);
  const { data: warehouses } = useWarehousesControllerList();
  const [reserveCtx, setReserveCtx] = useState<ReserveContext | null>(null);

  const queryClient = useQueryClient();
  const rows = data?.data ?? [];
  const total = data?.total ?? 0;
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  const invalidate = async (): Promise<void> => {
    await queryClient.invalidateQueries({
      queryKey: getInventoryControllerListQueryKey(params),
    });
  };

  return (
    <div className="flex flex-col gap-4">
      <PageHead title="View Inventory" />

      <div className="flex flex-wrap items-center gap-3">
        <Input
          aria-label="Search inventory"
          placeholder="Search by product or SKU…"
          value={search}
          onChange={(e) => { setSearch(e.target.value); setPage(1); }}
          className="max-w-xs"
        />
        <select
          aria-label="Filter by warehouse"
          value={warehouseId}
          onChange={(e) => { setWarehouseId(e.target.value); setPage(1); }}
          className="h-9 rounded-md border border-input bg-background px-3 text-sm"
        >
          <option value="">All my warehouses</option>
          {(warehouses ?? []).map((w) => (
            <option key={w.id} value={w.id}>{w.name}</option>
          ))}
        </select>
        <label className="flex items-center gap-2 text-sm text-muted-foreground">
          <input
            type="checkbox"
            checked={lowStock}
            onChange={(e) => { setLowStock(e.target.checked); setPage(1); }}
          />
          Low stock only
        </label>
      </div>

      {isLoading ? (
        <div className="flex flex-col gap-2">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-12 w-full" />
          ))}
        </div>
      ) : rows.length === 0 ? (
        <EmptyState
          title={search || warehouseId || lowStock ? 'No matches' : 'No stock'}
          description={
            search || warehouseId || lowStock
              ? 'No inventory matches the current filters.'
              : 'No stock is recorded for your warehouses yet.'
          }
        />
      ) : (
        <>
          <div className="rounded-xl bg-card ring-1 ring-foreground/10 overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Product</TableHead>
                  <TableHead>Warehouse</TableHead>
                  <TableHead className="text-right">Available</TableHead>
                  <TableHead className="text-right">Reserved</TableHead>
                  <TableHead className="text-right">Damaged</TableHead>
                  <TableHead className="text-right">In transit</TableHead>
                  <TableHead className="text-right">Total</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.map((r: InventoryItemDto) => (
                  <TableRow key={r.id}>
                    <TableCell>
                      <div className="flex items-center gap-2.5">
                        <EntityAvatar name={r.productName} />
                        <div>
                          <div className="text-[13px] font-semibold">{r.productName}</div>
                          <div className="font-mono text-xs text-muted-foreground">{r.sku}</div>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>{r.warehouseName}</TableCell>
                    <TableCell className="text-right tabular-nums">
                      <span className="inline-flex items-center gap-2">
                        {r.lowStock && <StatusBadge tone="warn">Low</StatusBadge>}
                        {r.available}
                      </span>
                    </TableCell>
                    <TableCell className="text-right tabular-nums">{r.reserved}</TableCell>
                    <TableCell className="text-right tabular-nums">{r.damaged}</TableCell>
                    <TableCell className="text-right tabular-nums">{r.inTransit}</TableCell>
                    <TableCell className="text-right font-semibold tabular-nums">{r.total}</TableCell>
                    <TableCell className="text-right">
                      <Button
                        variant="outline"
                        size="sm"
                        disabled={r.available < 1}
                        onClick={() =>
                          setReserveCtx({
                            productId: r.productId,
                            warehouseId: r.warehouseId,
                            productName: r.productName,
                            warehouseName: r.warehouseName,
                            available: r.available,
                          })
                        }
                      >
                        Reserve
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

          <div className="flex items-center justify-between text-sm text-muted-foreground">
            <span>{total} item{total === 1 ? '' : 's'}</span>
            <div className="flex items-center gap-3">
              <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>Previous</Button>
              <span>Page {page} of {totalPages}</span>
              <Button variant="outline" size="sm" disabled={page >= totalPages} onClick={() => setPage((p) => p + 1)}>Next</Button>
            </div>
          </div>
        </>
      )}

      {reserveCtx && (
        <ReserveStockDialog
          context={reserveCtx}
          onClose={() => setReserveCtx(null)}
          onSuccess={invalidate}
        />
      )}
    </div>
  );
}
