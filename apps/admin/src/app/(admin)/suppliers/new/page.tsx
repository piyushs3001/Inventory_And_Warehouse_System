'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { buttonVariants, PageContainer, PageHead, Section } from '@iws/ui';
import { SupplierForm } from '../supplier-form';

export default function NewSupplierPage() {
  const router = useRouter();
  return (
    <PageContainer>
      <Link
        href="/suppliers"
        className={buttonVariants({ variant: 'ghost', size: 'sm' }) + ' self-start'}
      >
        ← Back
      </Link>
      <PageHead title="New supplier" />
      <Section>
        <SupplierForm onDone={() => router.push('/suppliers')} />
      </Section>
    </PageContainer>
  );
}
