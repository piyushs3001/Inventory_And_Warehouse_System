'use client';

import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { buttonVariants, PageContainer, PageHead, Section } from '@iws/ui';
import { WarehouseForm } from '../warehouse-form';

export default function NewWarehousePage() {
  const router = useRouter();
  return (
    <PageContainer>
      <Link
        href="/warehouses"
        className={buttonVariants({ variant: 'ghost', size: 'sm' }) + ' self-start'}
      >
        ← Back
      </Link>
      <PageHead title="New warehouse" />
      <Section>
        <WarehouseForm onDone={() => router.push('/warehouses')} />
      </Section>
    </PageContainer>
  );
}
