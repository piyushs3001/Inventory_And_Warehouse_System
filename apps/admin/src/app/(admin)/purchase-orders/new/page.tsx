'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { buttonVariants, PageContainer, PageHead, Section } from '@iws/ui';
import { CreatePoForm } from '../create-po-form';

export default function NewPurchaseOrderPage() {
  const router = useRouter();
  return (
    <PageContainer>
      <Link href="/purchase-orders" className={buttonVariants({ variant: 'ghost', size: 'sm' }) + ' self-start'}>← Back</Link>
      <PageHead title="New purchase order" />
      <Section>
        <CreatePoForm onDone={() => router.push('/purchase-orders')} />
      </Section>
    </PageContainer>
  );
}
