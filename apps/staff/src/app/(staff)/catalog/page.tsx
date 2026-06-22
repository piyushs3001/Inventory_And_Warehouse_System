'use client';

import {
  useProductsControllerList,
  useCategoriesControllerList,
} from '@iws/api-client';
import type { ProductDto } from '@iws/api-client';
import {
  PageHead,
  EmptyState,
  EntityAvatar,
  DataTable,
  RowActions,
  type DataTableColumn,
} from '@iws/ui';

// Staff catalog is READ-ONLY — staff browse products + their variants, they
// don't manage them. (Server-side, catalog writes are role-gated to MGR+Admin.)
// Each row links to a read-only detail page at /catalog/[id].
export default function CatalogPage() {
  const { data: products, isLoading } = useProductsControllerList({});
  const { data: categories } = useCategoriesControllerList();

  const list = products ?? [];
  const categoryName = new Map((categories ?? []).map((c) => [c.id, c.name]));

  const columns: DataTableColumn<ProductDto>[] = [
    {
      key: 'name',
      header: 'Name',
      cell: (p) => (
        <div className="flex items-center gap-2.5">
          <EntityAvatar name={p.name} imageUrl={p.imageUrl} />
          <span className="text-[13px] font-semibold">{p.name}</span>
        </div>
      ),
      sortValue: (p) => p.name,
    },
    {
      key: 'sku',
      header: 'SKU',
      className: 'font-mono text-xs',
      cell: (p) => p.sku,
      sortValue: (p) => p.sku,
    },
    {
      key: 'category',
      header: 'Category',
      cell: (p) =>
        p.categoryId ? (categoryName.get(p.categoryId) ?? '—') : '—',
    },
    {
      key: 'price',
      header: 'Price',
      align: 'right',
      className: 'font-mono tabular-nums',
      cell: (p) => p.sellingPrice,
      sortValue: (p) => Number(p.sellingPrice),
    },
    {
      key: 'actions',
      header: 'Actions',
      align: 'right',
      cell: (p) => <RowActions viewHref={`/catalog/${p.id}`} />,
    },
  ];

  return (
    <div className="flex flex-col gap-4">
      <PageHead title="Catalog" />

      <DataTable
        rows={list}
        getRowKey={(p) => p.id}
        isLoading={isLoading}
        columns={columns}
        searchPlaceholder="Search by name or SKU…"
        searchFilter={(p, q) =>
          p.name.toLowerCase().includes(q) || p.sku.toLowerCase().includes(q)
        }
        empty={
          <EmptyState
            title="No products"
            description="The product catalog is empty."
          />
        }
      />
    </div>
  );
}
