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
  DataTable,
  type DataTableColumn,
  EntityAvatar,
  SimpleCombobox,
  Checkbox,
  Label,
} from '@iws/ui';
import { ReserveStockDialog, type ReserveContext } from './reserve-stock-dialog';

const PAGE_SIZE = 100;

// Staff inventory is read-only EXCEPT reserving stock (available -> reserved),
// which staff are permitted to do. Adjustments are manager/admin only and are
// not offered here. The list is scope-filtered server-side to the staff
// member's assigned warehouses. Search + pagination are handled client-side by
// DataTable over the fetched page.
export default function ViewInventoryPage() {
  const [warehouseId, setWarehouseId] = useState('');
  const [lowStock, setLowStock] = useState(false);

  const params = {
    ...(warehouseId ? { warehouseId } : {}),
    ...(lowStock ? { lowStock: true } : {}),
    pageSize: PAGE_SIZE,
  };

  const { data, isLoading } = useInventoryControllerList(params);
  const { data: warehouses } = useWarehousesControllerList();
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
      <PageHead title="View Inventory" />

      <DataTable
        rows={rows}
        getRowKey={(r) => r.id}
        isLoading={isLoading}
        searchPlaceholder="Search by product or SKU…"
        searchFilter={(r, q) =>
          r.productName.toLowerCase().includes(q) ||
          r.sku.toLowerCase().includes(q) ||
          r.warehouseName.toLowerCase().includes(q)
        }
        toolbar={
          <>
            <SimpleCombobox
              aria-label="Filter by warehouse"
              className="w-48"
              searchPlaceholder="Search warehouses…"
              value={warehouseId}
              onValueChange={setWarehouseId}
              options={[
                { value: '', label: 'All my warehouses' },
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
            title={warehouseId || lowStock ? 'No matches' : 'No stock'}
            description={
              warehouseId || lowStock
                ? 'No inventory matches the current filters.'
                : 'No stock is recorded for your warehouses yet.'
            }
          />
        }
        columns={columns}
      />

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
