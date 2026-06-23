'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { buttonVariants, PageContainer, PageHead, Section } from '@iws/ui';
import { CountForm } from '../count-form';

export default function NewCountPage() {
  const router = useRouter();
  return (
    <PageContainer>
      <Link href="/counting" className={buttonVariants({ variant: 'ghost', size: 'sm' }) + ' self-start'}>← Back</Link>
      <PageHead title="New stock count" />
      <Section>
        <CountForm onDone={(id) => router.push(`/counting/${id}`)} />
      </Section>
    </PageContainer>
  );
}
