'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { buttonVariants, PageContainer, PageHead, Section } from '@iws/ui';
import { ProductForm } from '../product-form';

export default function NewProductPage() {
  const router = useRouter();
  return (
    <PageContainer>
      <Link href="/products" className={buttonVariants({ variant: 'ghost', size: 'sm' }) + ' self-start'}>← Back</Link>
      <PageHead title="New product" />
      <Section>
        <ProductForm onDone={() => router.push('/products')} />
      </Section>
    </PageContainer>
  );
}
