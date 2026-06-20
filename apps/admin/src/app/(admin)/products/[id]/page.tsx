'use client';

import type { ReactNode } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import {
  useProductsControllerFindOne,
  useCategoriesControllerList,
  ProductStatus,
} from '@iws/api-client';
import {
  buttonVariants,
  PageHead,
  StatusBadge,
  Skeleton,
  ErrorState,
} from '@iws/ui';
import { VariantsSection } from '../variants-section';
import { ProductBarcode } from '../barcode-controls';

export default function ProductDetailPage() {
  const id = useParams().id as string;
  const { data: product, isLoading, isError } = useProductsControllerFindOne(id);
  const { data: categories } = useCategoriesControllerList();

  if (isLoading) return <Skeleton className="h-96 w-full" />;
  if (isError || !product) {
    return <ErrorState title="Product not found" description="It may not exist or be outside your scope." />;
  }

  const categoryName = product.categoryId
    ? (categories ?? []).find((c) => c.id === product.categoryId)?.name ?? '—'
    : '—';

  return (
    <div className="flex flex-col gap-5">
      <Link href="/products" className={buttonVariants({ variant: 'ghost', size: 'sm' }) + ' self-start'}>← Back</Link>
      <PageHead
        title={product.name}
        actions={
          <Link href={`/products/${product.id}/edit`} className={buttonVariants({ size: 'sm' })}>
            Edit
          </Link>
        }
      />

      <div className="grid grid-cols-2 gap-x-8 gap-y-3 rounded-xl bg-card p-4 ring-1 ring-foreground/10 sm:grid-cols-4">
        <Field label="SKU"><span className="font-mono text-xs">{product.sku}</span></Field>
        <Field label="Category">{categoryName}</Field>
        <Field label="Unit">{product.unit ?? '—'}</Field>
        <Field label="Status">
          <StatusBadge tone={product.status === ProductStatus.ACTIVE ? 'ok' : 'muted'}>
            {product.status}
          </StatusBadge>
        </Field>
        <Field label="Cost price"><span className="font-mono tabular-nums">{product.costPrice}</span></Field>
        <Field label="Selling price"><span className="font-mono tabular-nums">{product.sellingPrice}</span></Field>
        <Field label="Reorder level"><span className="font-mono tabular-nums">{product.reorderLevel}</span></Field>
        <Field label="Description">{product.description ?? '—'}</Field>
      </div>

      <section className="rounded-xl bg-card p-4 ring-1 ring-foreground/10">
        <VariantsSection productId={product.id} />
      </section>

      <section className="flex flex-col gap-3 rounded-xl bg-card p-4 ring-1 ring-foreground/10">
        <h3 className="text-sm font-semibold">Product barcode</h3>
        <ProductBarcode productId={product.id} />
      </section>
    </div>
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
