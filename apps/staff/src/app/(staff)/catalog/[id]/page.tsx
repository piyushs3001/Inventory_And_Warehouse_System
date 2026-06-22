'use client';

import { useState, type ReactNode } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import {
  useProductsControllerFindOne,
  useCategoriesControllerList,
  useVariantsControllerList,
  ProductStatus,
} from '@iws/api-client';
import {
  buttonVariants,
  PageHead,
  StatusBadge,
  Skeleton,
  ErrorState,
  Button,
  EntityAvatar,
} from '@iws/ui';
import { VariantBarcode } from '../variant-barcode';

// Read-only product detail for the staff catalog. Staff browse a product, its
// info, and its variants (sku + attribute chips + scan barcode) — no management
// controls. (Server-side, catalog writes are role-gated to MGR+Admin.)
export default function CatalogDetailPage() {
  const id = useParams().id as string;
  const { data: product, isLoading, isError } = useProductsControllerFindOne(id);
  const { data: categories } = useCategoriesControllerList();

  if (isLoading) return <Skeleton className="h-96 w-full" />;
  if (isError || !product) {
    return (
      <ErrorState
        title="Product not found"
        description="It may not exist or be outside your scope."
        action={
          <Link href="/catalog" className={buttonVariants({ variant: 'outline', size: 'sm' })}>
            Back to catalog
          </Link>
        }
      />
    );
  }

  const categoryName = product.categoryId
    ? (categories ?? []).find((c) => c.id === product.categoryId)?.name ?? '—'
    : '—';

  return (
    <div className="flex flex-col gap-5">
      <Link href="/catalog" className={buttonVariants({ variant: 'ghost', size: 'sm' }) + ' self-start'}>← Back</Link>
      <div className="flex items-center gap-3">
        <EntityAvatar name={product.name} imageUrl={product.imageUrl} className="size-12 text-base" />
        <PageHead title={product.name} />
      </div>

      <div className="grid grid-cols-2 gap-x-8 gap-y-3 rounded-xl bg-card p-4 ring-1 ring-foreground/10 sm:grid-cols-4">
        <Field label="SKU"><span className="font-mono text-xs">{product.sku}</span></Field>
        <Field label="Category">{categoryName}</Field>
        <Field label="Unit">{product.unit ?? '—'}</Field>
        <Field label="Status">
          <StatusBadge tone={product.status === ProductStatus.ACTIVE ? 'ok' : 'muted'}>
            {product.status}
          </StatusBadge>
        </Field>
        <Field label="Selling price"><span className="font-mono tabular-nums">{product.sellingPrice}</span></Field>
        <Field label="Reorder level"><span className="font-mono tabular-nums">{product.reorderLevel}</span></Field>
        <Field label="Description"><span className="col-span-full">{product.description ?? '—'}</span></Field>
      </div>

      <section className="flex flex-col gap-3 rounded-xl bg-card p-4 ring-1 ring-foreground/10">
        <h3 className="text-sm font-semibold">Variants</h3>
        <VariantsList productId={product.id} />
      </section>
    </div>
  );
}

function VariantsList({ productId }: { productId: string }) {
  const { data: variants, isLoading } = useVariantsControllerList(productId);
  const [barcodeFor, setBarcodeFor] = useState<string | null>(null);
  const list = variants ?? [];

  if (isLoading) {
    return <p className="text-sm text-muted-foreground">Loading variants…</p>;
  }
  if (list.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">No variants for this product.</p>
    );
  }

  return (
    <ul className="flex flex-col gap-2.5">
      {list.map((v) => (
        <li
          key={v.id}
          className="flex flex-col gap-2 rounded-lg bg-muted/30 p-3"
        >
          <div className="flex flex-wrap items-center gap-2">
            <EntityAvatar name={v.sku} imageUrl={v.imageUrl} className="size-7 text-[10px]" />
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
              className="ml-auto"
              aria-expanded={barcodeFor === v.id}
              onClick={() =>
                setBarcodeFor((cur) => (cur === v.id ? null : v.id))
              }
            >
              {barcodeFor === v.id ? 'Hide barcode' : 'Show barcode'}
            </Button>
          </div>
          {barcodeFor === v.id && (
            <VariantBarcode productId={productId} variantId={v.id} />
          )}
        </li>
      ))}
    </ul>
  );
}

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="flex flex-col gap-0.5">
      <span className="text-xs text-muted-foreground">{label}</span>
      <span className="text-sm font-medium">{children}</span>
    </div>
  );
}
