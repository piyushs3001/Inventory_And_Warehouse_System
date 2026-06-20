'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useQueryClient } from '@tanstack/react-query';
import {
  useProductsControllerList,
  useProductsControllerArchive,
  getProductsControllerListQueryKey,
  useCategoriesControllerList,
} from '@iws/api-client';
import { ProductStatus } from '@iws/api-client';
import type { ProductDto } from '@iws/api-client';
import {
  Button,
  buttonVariants,
  PageHead,
  StatusBadge,
  EmptyState,
  EntityAvatar,
  DataTable,
  type DataTableColumn,
} from '@iws/ui';

export default function ProductsPage() {
  const [categoryId, setCategoryId] = useState('');
  const [includeArchived, setIncludeArchived] = useState(false);

  const params = {
    ...(categoryId ? { categoryId } : {}),
    ...(includeArchived ? { includeArchived: true } : {}),
  };
  const { data: products, isLoading } = useProductsControllerList(params);
  const { data: categories } = useCategoriesControllerList();

  const queryClient = useQueryClient();
  const archive = useProductsControllerArchive();

  const list = products ?? [];
  const categoryName = new Map((categories ?? []).map((c) => [c.id, c.name]));

  const invalidateList = async (): Promise<void> => {
    await queryClient.invalidateQueries({
      queryKey: getProductsControllerListQueryKey(params),
    });
  };

  const onArchive = async (id: string): Promise<void> => {
    if (!confirm('Archive this product?')) return;
    await archive.mutateAsync({ id });
    await invalidateList();
  };

  const columns: DataTableColumn<ProductDto>[] = [
    {
      key: 'name',
      header: 'Name',
      cell: (p) => (
        <div className="flex items-center gap-2.5">
          <EntityAvatar name={p.name} />
          <span className="text-[13px] font-semibold">{p.name}</span>
        </div>
      ),
      sortValue: (p) => p.name,
    },
    {
      key: 'sku',
      header: 'SKU',
      cell: (p) => <span className="font-mono text-xs">{p.sku}</span>,
      sortValue: (p) => p.sku,
    },
    {
      key: 'category',
      header: 'Category',
      cell: (p) => (p.categoryId ? (categoryName.get(p.categoryId) ?? '—') : '—'),
      sortValue: (p) => (p.categoryId ? (categoryName.get(p.categoryId) ?? '') : ''),
    },
    {
      key: 'cost',
      header: 'Cost',
      align: 'right',
      cell: (p) => <span className="font-mono tabular-nums">{p.costPrice}</span>,
      sortValue: (p) => Number(p.costPrice),
    },
    {
      key: 'sell',
      header: 'Sell',
      align: 'right',
      cell: (p) => <span className="font-mono tabular-nums">{p.sellingPrice}</span>,
      sortValue: (p) => Number(p.sellingPrice),
    },
    {
      key: 'reorder',
      header: 'Reorder',
      align: 'right',
      cell: (p) => <span className="font-mono tabular-nums">{p.reorderLevel}</span>,
      sortValue: (p) => p.reorderLevel,
    },
    {
      key: 'status',
      header: 'Status',
      cell: (p) => (
        <StatusBadge tone={p.status === ProductStatus.ACTIVE ? 'ok' : 'muted'}>{p.status}</StatusBadge>
      ),
      sortValue: (p) => p.status,
    },
    {
      key: 'actions',
      header: 'Actions',
      align: 'right',
      cell: (p) => (
        <div className="flex justify-end gap-2">
          <Link className={buttonVariants({ variant: 'outline', size: 'sm' })} href={`/products/${p.id}`}>View</Link>
          <Link className={buttonVariants({ variant: 'outline', size: 'sm' })} href={`/products/${p.id}/edit`}>Edit</Link>
          {p.status === ProductStatus.ACTIVE && (
            <Button variant="outline" size="sm" onClick={() => onArchive(p.id)}>Archive</Button>
          )}
        </div>
      ),
    },
  ];

  return (
    <div className="flex flex-col gap-4">
      <PageHead
        title="Products"
        actions={
          <Link className={buttonVariants()} href="/products/new">New product</Link>
        }
      />

      <DataTable
        rows={list}
        getRowKey={(p) => p.id}
        isLoading={isLoading}
        columns={columns}
        searchPlaceholder="Search by name or SKU…"
        searchFilter={(p, q) =>
          p.name.toLowerCase().includes(q) || p.sku.toLowerCase().includes(q)
        }
        toolbar={
          <>
            <select
              aria-label="Filter by category"
              value={categoryId}
              onChange={(e) => setCategoryId(e.target.value)}
              className="h-9 rounded-md border border-input bg-background px-3 text-sm"
            >
              <option value="">All categories</option>
              {(categories ?? []).map((c) => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
            <label className="flex items-center gap-2 text-sm text-muted-foreground">
              <input type="checkbox" checked={includeArchived} onChange={(e) => setIncludeArchived(e.target.checked)} />
              Include archived
            </label>
          </>
        }
        empty={
          <EmptyState
            title="No products"
            description="Create a product to build out the catalog."
            action={<Link className={buttonVariants()} href="/products/new">New product</Link>}
          />
        }
      />
    </div>
  );
}
