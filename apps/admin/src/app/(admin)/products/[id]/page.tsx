'use client';

import Link from 'next/link';
import { useParams } from 'next/navigation';
import {
  useProductsControllerFindOne,
  useCategoriesControllerList,
  ProductStatus,
} from '@iws/api-client';
import {
  buttonVariants,
  Field,
  PageContainer,
  PageHead,
  Section,
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
    <PageContainer>
      <Link href="/products" className={buttonVariants({ variant: 'ghost', size: 'sm' }) + ' self-start'}>← Back</Link>
      <PageHead
        title={
          <span className="flex items-center gap-3">
            {product.name}
            <StatusBadge tone={product.status === ProductStatus.ACTIVE ? 'ok' : 'muted'}>
              {product.status}
            </StatusBadge>
          </span>
        }
        actions={
          <Link href={`/products/${product.id}/edit`} className={buttonVariants({ size: 'sm' })}>
            Edit
          </Link>
        }
      />

      {product.imageUrl && (
        <div className="overflow-hidden rounded-xl ring-1 ring-foreground/10">
          {/* Signed MinIO/S3 URL — next/image optimizer is not used for short-lived signed assets */}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={product.imageUrl}
            alt={product.name}
            className="max-h-64 w-full object-contain bg-muted"
          />
        </div>
      )}

      <Section title="Details">
        <div className="grid grid-cols-2 gap-x-8 gap-y-3 sm:grid-cols-4">
          <Field label="SKU"><span className="font-mono text-xs">{product.sku}</span></Field>
          <Field label="Category">{categoryName}</Field>
          <Field label="Unit">{product.unit ?? '—'}</Field>
          <Field label="Cost price"><span className="font-mono tabular-nums">{product.costPrice}</span></Field>
          <Field label="Selling price"><span className="font-mono tabular-nums">{product.sellingPrice}</span></Field>
          <Field label="Reorder level"><span className="font-mono tabular-nums">{product.reorderLevel}</span></Field>
          <Field label="Description">{product.description ?? '—'}</Field>
        </div>
      </Section>

      <Section>
        <VariantsSection productId={product.id} />
      </Section>

      <Section title="Product barcode">
        <ProductBarcode productId={product.id} />
      </Section>
    </PageContainer>
  );
}
