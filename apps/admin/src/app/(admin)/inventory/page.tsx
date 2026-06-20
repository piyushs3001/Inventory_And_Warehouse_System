'use client';

import { useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import {
  useInventoryControllerList,
  getInventoryControllerListQueryKey,
  useWarehousesControllerList,
  useProductsControllerList,
} from '@iws/api-client';
import type { InventoryItemDto } from '@iws/api-client';
import {
  Button,
  PageHead,
  StatusBadge,
  EmptyState,
  DataTable,
  type DataTableColumn,
  EntityAvatar,
  SimpleSelect,
  Checkbox,
  Label,
} from '@iws/ui';
import { AdjustStockDialog, type AdjustContext } from './adjust-stock-dialog';
import { ReserveStockDialog, type ReserveContext } from './reserve-stock-dialog';

const PAGE_SIZE = 100;

export default function InventoryPage() {
  const [warehouseId, setWarehouseId] = useState('');
  const [lowStock, setLowStock] = useState(false);

  const params = {
    ...(warehouseId ? { warehouseId } : {}),
    ...(lowStock ? { lowStock: true } : {}),
    pageSize: PAGE_SIZE,
  };

  const { data, isLoading } = useInventoryControllerList(params);
  const { data: warehouses } = useWarehousesControllerList();
  const { data: products } = useProductsControllerList();

  const [adjustCtx, setAdjustCtx] = useState<AdjustContext | null>(null);
  const [adding, setAdding] = useState(false);
  const [reserveCtx, setReserveCtx] = useState<ReserveContext | null>(null);

  const queryClient = useQueryClient();
  const rows = data?.data ?? [];

  const invalidate = async (): Promise<void> => {
    await queryClient.invalidateQueries({
      queryKey: getInventoryControllerListQueryKey(params),
    });
  };

  const columns: DataTableColumn<InventoryItemDto>[] = [
    {
      key: 'product',
      header: 'Product',
      cell: (r) => (
        <div className="flex items-center gap-2.5">
          <EntityAvatar name={r.productName} />
          <div>
            <div className="text-[13px] font-semibold">{r.productName}</div>
            <div className="font-mono text-xs text-muted-foreground">{r.sku}</div>
          </div>
        </div>
      ),
      sortValue: (r) => r.productName,
    },
    {
      key: 'warehouse',
      header: 'Warehouse',
      cell: (r) => r.warehouseName,
      sortValue: (r) => r.warehouseName,
    },
    {
      key: 'available',
      header: 'Available',
      align: 'right',
      className: 'tabular-nums',
      cell: (r) => (
        <span className="inline-flex items-center gap-2">
          {r.lowStock && <StatusBadge tone="warn">Low</StatusBadge>}
          {r.available}
        </span>
      ),
      sortValue: (r) => r.available,
    },
    {
      key: 'reserved',
      header: 'Reserved',
      align: 'right',
      className: 'tabular-nums',
      cell: (r) => r.reserved,
      sortValue: (r) => r.reserved,
    },
    {
      key: 'damaged',
      header: 'Damaged',
      align: 'right',
      className: 'tabular-nums',
      cell: (r) => r.damaged,
      sortValue: (r) => r.damaged,
    },
    {
      key: 'inTransit',
      header: 'In transit',
      align: 'right',
      className: 'tabular-nums',
      cell: (r) => r.inTransit,
      sortValue: (r) => r.inTransit,
    },
    {
      key: 'total',
      header: 'Total',
      align: 'right',
      className: 'font-semibold tabular-nums',
      cell: (r) => r.total,
      sortValue: (r) => r.total,
    },
    {
      key: 'actions',
      header: 'Actions',
      align: 'right',
      cell: (r) => (
        <div className="flex justify-end gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() =>
              setAdjustCtx({
                productId: r.productId,
                warehouseId: r.warehouseId,
                productName: r.productName,
                warehouseName: r.warehouseName,
                available: r.available,
                damaged: r.damaged,
              })
            }
          >
            Adjust
          </Button>
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
        </div>
      ),
    },
  ];

  return (
    <div className="flex flex-col gap-4">
      <PageHead
        title="Inventory"
        actions={<Button onClick={() => setAdding(true)}>Adjust stock</Button>}
      />

      <DataTable
        rows={rows}
        getRowKey={(r) => r.id}
        isLoading={isLoading}
        searchPlaceholder="Search by product or warehouse…"
        searchFilter={(r, q) =>
          r.productName.toLowerCase().includes(q) ||
          r.sku.toLowerCase().includes(q) ||
          r.warehouseName.toLowerCase().includes(q)
        }
        toolbar={
          <>
            <SimpleSelect
              aria-label="Filter by warehouse"
              className="w-48"
              value={warehouseId}
              onValueChange={setWarehouseId}
              options={[
                { value: '', label: 'All warehouses' },
                ...(warehouses ?? []).map((w) => ({ value: w.id, label: w.name })),
              ]}
            />
            <Label className="flex items-center gap-2 text-sm font-normal text-muted-foreground">
              <Checkbox
                checked={lowStock}
                onCheckedChange={(v) => setLowStock(v === true)}
              />
              Low stock only
            </Label>
          </>
        }
        empty={
          <EmptyState
            title={warehouseId || lowStock ? 'No matches' : 'No stock yet'}
            description={
              warehouseId || lowStock
                ? 'No inventory matches the current filters.'
                : 'Use “Adjust stock” to record opening quantities.'
            }
            action={<Button onClick={() => setAdding(true)}>Adjust stock</Button>}
          />
        }
        columns={columns}
      />

      {(adding || adjustCtx) && (
        <AdjustStockDialog
          context={adjustCtx ?? undefined}
          products={products ?? []}
          warehouses={warehouses ?? []}
          onClose={() => { setAdding(false); setAdjustCtx(null); }}
          onSuccess={invalidate}
        />
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
