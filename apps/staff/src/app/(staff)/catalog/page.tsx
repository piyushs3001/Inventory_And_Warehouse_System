'use client';

import { useState } from 'react';
import {
  useProductsControllerList,
  useCategoriesControllerList,
  useVariantsControllerList,
} from '@iws/api-client';
import type { ProductDto } from '@iws/api-client';
import { PageHead } from '@iws/ui';
import { EmptyState } from '@iws/ui';
import { Skeleton } from '@iws/ui';
import { Input } from '@iws/ui';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@iws/ui';
import { EntityAvatar } from '@iws/ui';
import { Button } from '@iws/ui';
import { VariantBarcode } from './variant-barcode';

// Staff catalog is READ-ONLY — staff browse products + their variants, they
// don't manage them. (Server-side, catalog writes are role-gated to MGR+Admin.)
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
          title={search ? 'No matches' : 'No products'}
          description={
            search
              ? 'No products match your search.'
              : 'The product catalog is empty.'
          }
        />
      ) : (
        <div className="rounded-xl bg-card ring-1 ring-foreground/10 overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-8" />
                <TableHead>Name</TableHead>
                <TableHead>SKU</TableHead>
                <TableHead>Category</TableHead>
                <TableHead className="text-right">Price</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {list.map((p) => (
                <CatalogRow
                  key={p.id}
                  product={p}
                  categoryName={
                    p.categoryId ? (categoryName.get(p.categoryId) ?? '—') : '—'
                  }
                />
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
}

function CatalogRow({
  product,
  categoryName,
}: {
  product: ProductDto;
  categoryName: string;
}) {
  const [expanded, setExpanded] = useState(false);
  const [barcodeFor, setBarcodeFor] = useState<string | null>(null);
  const { data: variants, isLoading } = useVariantsControllerList(
    product.id,
    undefined,
    { query: { enabled: expanded } },
  );
  const list = variants ?? [];

  return (
    <>
      <TableRow>
        <TableCell>
          <button
            type="button"
            aria-label={expanded ? 'Collapse variants' : 'Expand variants'}
            aria-expanded={expanded}
            onClick={() => setExpanded((v) => !v)}
            className="text-muted-foreground"
          >
            {expanded ? '▾' : '▸'}
          </button>
        </TableCell>
        <TableCell>
          <div className="flex items-center gap-2.5">
            <EntityAvatar name={product.name} />
            <div className="text-[13px] font-semibold">{product.name}</div>
          </div>
        </TableCell>
        <TableCell className="font-mono text-xs">{product.sku}</TableCell>
        <TableCell>{categoryName}</TableCell>
        <TableCell className="text-right font-mono tabular-nums">
          {product.sellingPrice}
        </TableCell>
      </TableRow>
      {expanded && (
        <TableRow>
          <TableCell colSpan={5} className="bg-muted/30">
            {isLoading ? (
              <p className="text-sm text-muted-foreground">Loading variants…</p>
            ) : list.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                No variants for this product.
              </p>
            ) : (
              <ul className="flex flex-col gap-1.5 py-1">
                {list.map((v) => (
                  <li key={v.id} className="flex flex-col gap-1.5">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-mono text-xs">{v.sku}</span>
                      {Object.entries(v.attributes).map(([k, val]) => (
                        <span
                          key={k}
                          className="rounded bg-foreground/10 px-1.5 py-0.5 text-[11px]"
                        >
                          {k}: {val}
                        </span>
                      ))}
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        aria-expanded={barcodeFor === v.id}
                        onClick={() =>
                          setBarcodeFor((cur) => (cur === v.id ? null : v.id))
                        }
                      >
                        {barcodeFor === v.id ? 'Hide barcode' : 'Show barcode'}
                      </Button>
                    </div>
                    {barcodeFor === v.id && (
                      <VariantBarcode
                        productId={product.id}
                        variantId={v.id}
                      />
                    )}
                  </li>
                ))}
              </ul>
            )}
          </TableCell>
        </TableRow>
      )}
    </>
  );
}
