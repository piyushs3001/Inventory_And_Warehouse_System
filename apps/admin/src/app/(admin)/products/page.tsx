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
import { toast } from 'sonner';
import {
  buttonVariants,
  PageHead,
  StatusBadge,
  EmptyState,
  EntityAvatar,
  DataTable,
  SimpleCombobox,
  Switch,
  Label,
  RowActions,
  useConfirm,
  type DataTableColumn,
} from '@iws/ui';

export default function ProductsPage() {
  const confirm = useConfirm();
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

  const onArchive = async (id: string, name: string): Promise<void> => {
    const ok = await confirm({
      title: 'Archive product?',
      description: `"${name}" will be hidden from the active catalog. You can re-enable it later.`,
      confirmLabel: 'Archive',
      tone: 'danger',
    });
    if (!ok) return;
    try {
      await archive.mutateAsync({ id });
      await invalidateList();
      toast.success('Product archived');
    } catch {
      toast.error('Could not archive product');
    }
  };

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
        <RowActions
          viewHref={`/products/${p.id}`}
          editHref={`/products/${p.id}/edit`}
          onDelete={p.status === ProductStatus.ACTIVE ? () => onArchive(p.id, p.name) : undefined}
          labels={{ delete: 'Archive' }}
        />
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
            <SimpleCombobox
              aria-label="Filter by category"
              className="w-48"
              value={categoryId}
              onValueChange={setCategoryId}
              searchPlaceholder="Search categories…"
              options={[
                { value: '', label: 'All categories' },
                ...(categories ?? []).map((c) => ({ value: c.id, label: c.name })),
              ]}
            />
            <Label className="flex items-center gap-2 text-sm font-normal text-muted-foreground">
              <Switch
                aria-label="Include archived"
                checked={includeArchived}
                onCheckedChange={(v) => setIncludeArchived(v === true)}
              />
              Include archived
            </Label>
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
