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
  DataTable,
  type DataTableColumn,
  SimpleSelect,
  SimpleCombobox,
} from '@iws/ui';

const PAGE_SIZE = 100;

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

  const params = {
    ...(type ? { type: type as MovementType } : {}),
    ...(warehouseId ? { warehouseId } : {}),
    ...(productId ? { productId } : {}),
    ...(from ? { from: new Date(from).toISOString() } : {}),
    ...(to ? { to: new Date(to).toISOString() } : {}),
    pageSize: PAGE_SIZE,
  };

  const { data, isLoading } = useMovementsControllerList(params);
  const { data: warehouses } = useWarehousesControllerList();
  const { data: products } = useProductsControllerList();

  const rows = data?.data ?? [];

  const columns: DataTableColumn<StockMovementDto>[] = [
    {
      key: 'when',
      header: 'When',
      className: 'whitespace-nowrap text-xs text-muted-foreground',
      cell: (m) => new Date(m.createdAt).toLocaleString(),
      sortValue: (m) => m.createdAt,
    },
    {
      key: 'type',
      header: 'Type',
      cell: (m) => <StatusBadge tone={TYPE_TONE[m.type]}>{m.type}</StatusBadge>,
      sortValue: (m) => m.type,
    },
    {
      key: 'product',
      header: 'Product',
      cell: (m) => (
        <div>
          <div className="text-[13px] font-semibold">{m.productName}</div>
          <div className="font-mono text-xs text-muted-foreground">{m.sku}</div>
        </div>
      ),
      sortValue: (m) => m.productName,
    },
    {
      key: 'warehouse',
      header: 'Warehouse',
      cell: (m) => m.warehouseName,
      sortValue: (m) => m.warehouseName,
    },
    {
      key: 'change',
      header: 'Change',
      className: 'font-mono text-xs tabular-nums',
      cell: (m) => deltaSummary(m),
    },
    {
      key: 'before',
      header: 'Before',
      align: 'right',
      className: 'tabular-nums',
      cell: (m) => m.beforeQty,
      sortValue: (m) => m.beforeQty,
    },
    {
      key: 'after',
      header: 'After',
      align: 'right',
      className: 'tabular-nums',
      cell: (m) => m.afterQty,
      sortValue: (m) => m.afterQty,
    },
    {
      key: 'reason',
      header: 'Reason',
      className: 'max-w-[16rem] truncate text-sm text-muted-foreground',
      cell: (m) => <span title={m.reason ?? ''}>{m.reason ?? '—'}</span>,
    },
    {
      key: 'by',
      header: 'By',
      className: 'text-sm',
      cell: (m) => m.userName ?? '—',
      sortValue: (m) => m.userName ?? '',
    },
  ];

  return (
    <div className="flex flex-col gap-4">
      <PageHead title="Movements" />
      <p className="text-sm text-muted-foreground -mt-2">
        Append-only ledger of every stock quantity change. Read-only.
      </p>

      <DataTable
        rows={rows}
        getRowKey={(m) => m.id}
        isLoading={isLoading}
        searchPlaceholder="Search by product or type…"
        searchFilter={(m, q) =>
          m.productName.toLowerCase().includes(q) ||
          m.sku.toLowerCase().includes(q) ||
          m.type.toLowerCase().includes(q)
        }
        toolbar={
          <>
            <SimpleSelect
              aria-label="Filter by type"
              className="w-44"
              value={type}
              onValueChange={setType}
              options={[
                { value: '', label: 'All types' },
                ...Object.values(MovementType).map((t) => ({ value: t, label: t })),
              ]}
            />
            <SimpleCombobox
              aria-label="Filter by warehouse"
              className="w-44"
              value={warehouseId}
              onValueChange={setWarehouseId}
              searchPlaceholder="Search warehouses…"
              options={[
                { value: '', label: 'All warehouses' },
                ...(warehouses ?? []).map((w) => ({ value: w.id, label: w.name })),
              ]}
            />
            <SimpleCombobox
              aria-label="Filter by product"
              className="w-44"
              value={productId}
              onValueChange={setProductId}
              searchPlaceholder="Search products…"
              options={[
                { value: '', label: 'All products' },
                ...(products ?? []).map((p) => ({
                  value: p.id,
                  label: p.name,
                  keywords: p.sku,
                })),
              ]}
            />
            <label className="flex items-center gap-1.5 text-sm text-muted-foreground">
              From
              <input type="date" value={from} onChange={(e) => setFrom(e.target.value)}
                className="h-9 rounded-md border border-input bg-background px-2 text-sm" />
            </label>
            <label className="flex items-center gap-1.5 text-sm text-muted-foreground">
              To
              <input type="date" value={to} onChange={(e) => setTo(e.target.value)}
                className="h-9 rounded-md border border-input bg-background px-2 text-sm" />
            </label>
          </>
        }
        empty={
          <EmptyState
            title="No movements"
            description="No stock movements match the current filters."
          />
        }
        columns={columns}
      />
    </div>
  );
}
