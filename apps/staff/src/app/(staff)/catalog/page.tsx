'use client';

import { useState } from 'react';
import {
  useProductsControllerList,
  useCategoriesControllerList,
} from '@iws/api-client';
import { PageHead } from '@iws/ui';
import { EmptyState } from '@iws/ui';
import { Skeleton } from '@iws/ui';
import { Input } from '@iws/ui';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@iws/ui';
import { EntityAvatar } from '@iws/ui';

// Staff catalog is READ-ONLY — staff browse products, they don't manage them.
// (Server-side, products writes are role-gated to MGR+Admin regardless.)
export default function CatalogPage() {
  const [search, setSearch] = useState('');
  const { data: products, isLoading } = useProductsControllerList(
    search ? { search } : {},
  );
  const { data: categories } = useCategoriesControllerList();

  const list = products ?? [];
  const categoryName = new Map((categories ?? []).map((c) => [c.id, c.name]));

  return (
    <div className="flex flex-col gap-4">
      <PageHead title="Catalog" />

      <Input
        aria-label="Search catalog"
        placeholder="Search by name or SKU…"
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        className="max-w-xs"
      />

      {isLoading ? (
        <div className="flex flex-col gap-2">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-12 w-full" />
          ))}
        </div>
      ) : list.length === 0 ? (
        <EmptyState
          title="No products"
          description="The product catalog is empty."
        />
      ) : (
        <div className="rounded-xl bg-card ring-1 ring-foreground/10 overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>SKU</TableHead>
                <TableHead>Category</TableHead>
                <TableHead className="text-right">Price</TableHead>
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
                  <TableCell className="text-right font-mono tabular-nums">{p.sellingPrice}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
}
