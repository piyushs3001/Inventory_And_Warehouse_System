'use client';

import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { useProductsControllerFindOne } from '@iws/api-client';
import { buttonVariants, ErrorState, PageContainer, PageHead, Section, Skeleton } from '@iws/ui';
import { ProductForm } from '../../product-form';

export default function EditProductPage() {
  const id = useParams().id as string;
  const router = useRouter();
  const { data: product, isLoading, isError } = useProductsControllerFindOne(id);

  return (
    <PageContainer>
      <Link href="/products" className={buttonVariants({ variant: 'ghost', size: 'sm' }) + ' self-start'}>← Back</Link>
      <PageHead title="Edit product" />
      {isLoading ? (
        <Skeleton className="h-96 w-full" />
      ) : isError || !product ? (
        <ErrorState title="Product not found" description="It may not exist or be outside your scope." />
      ) : (
        <Section>
          <ProductForm product={product} onDone={() => router.push('/products')} />
        </Section>
      )}
    </PageContainer>
  );
}
