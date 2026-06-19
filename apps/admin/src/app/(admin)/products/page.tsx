'use client';

import { useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import {
  useProductsControllerList,
  useProductsControllerArchive,
  getProductsControllerListQueryKey,
  useCategoriesControllerList,
} from '@iws/api-client';
import { ProductStatus } from '@iws/api-client';
import type { ProductDto } from '@iws/api-client';
import { Button } from '@iws/ui';
import { PageHead } from '@iws/ui';
import { StatusBadge } from '@iws/ui';
import { EmptyState } from '@iws/ui';
import { Skeleton } from '@iws/ui';
import { Input } from '@iws/ui';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@iws/ui';
import { EntityAvatar } from '@iws/ui';
import { ProductFormDialog } from './product-form-dialog';

export default function ProductsPage() {
  const [search, setSearch] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [includeArchived, setIncludeArchived] = useState(false);

  const params = {
    ...(search ? { search } : {}),
    ...(categoryId ? { categoryId } : {}),
    ...(includeArchived ? { includeArchived: true } : {}),
  };
  const { data: products, isLoading } = useProductsControllerList(params);
  const { data: categories } = useCategoriesControllerList();
  const [editing, setEditing] = useState<ProductDto | null>(null);
  const [creating, setCreating] = useState(false);

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

  return (
    <div className="flex flex-col gap-4">
      <PageHead
        title="Products"
        actions={<Button onClick={() => setCreating(true)}>New product</Button>}
      />

      <div className="flex flex-wrap items-center gap-3">
        <Input
          aria-label="Search products"
          placeholder="Search by name or SKU…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="max-w-xs"
        />
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
      </div>

      {isLoading ? (
        <div className="flex flex-col gap-2">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-12 w-full" />
          ))}
        </div>
      ) : list.length === 0 ? (
        <EmptyState
          title="No products"
          description="Create a product to build out the catalog."
          action={<Button onClick={() => setCreating(true)}>New product</Button>}
        />
      ) : (
        <div className="rounded-xl bg-card ring-1 ring-foreground/10 overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>SKU</TableHead>
                <TableHead>Category</TableHead>
                <TableHead className="text-right">Cost</TableHead>
                <TableHead className="text-right">Sell</TableHead>
                <TableHead className="text-right">Reorder</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {list.map((p) => (
                <TableRow key={p.id}>
                  <TableCell>
                    <div className="flex items-center gap-2.5">
                      <EntityAvatar name={p.name} />
                      <div className="text-[13px] font-semibold">{p.name}</div>
                    </div>
                  </TableCell>
                  <TableCell className="font-mono text-xs">{p.sku}</TableCell>
                  <TableCell>{p.categoryId ? (categoryName.get(p.categoryId) ?? '—') : '—'}</TableCell>
                  <TableCell className="text-right font-mono tabular-nums">{p.costPrice}</TableCell>
                  <TableCell className="text-right font-mono tabular-nums">{p.sellingPrice}</TableCell>
                  <TableCell className="text-right font-mono tabular-nums">{p.reorderLevel}</TableCell>
                  <TableCell>
                    <StatusBadge tone={p.status === ProductStatus.ACTIVE ? 'ok' : 'muted'}>{p.status}</StatusBadge>
                  </TableCell>
                  <TableCell className="space-x-2 text-right">
                    <Button variant="outline" size="sm" onClick={() => setEditing(p)}>Edit</Button>
                    {p.status === ProductStatus.ACTIVE && (
                      <Button variant="outline" size="sm" onClick={() => onArchive(p.id)}>Archive</Button>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      {creating && (
        <ProductFormDialog
          categories={categories ?? []}
          onClose={() => setCreating(false)}
          onSuccess={invalidateList}
        />
      )}
      {editing && (
        <ProductFormDialog
          product={editing}
          categories={categories ?? []}
          onClose={() => setEditing(null)}
          onSuccess={invalidateList}
        />
      )}
    </div>
  );
}
