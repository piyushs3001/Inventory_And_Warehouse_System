'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { buttonVariants, PageContainer, PageHead, Section } from '@iws/ui';
import { UserForm } from '../user-form';

export default function NewUserPage() {
  const router = useRouter();
  return (
    <PageContainer>
      <Link
        href="/users"
        className={buttonVariants({ variant: 'ghost', size: 'sm' }) + ' self-start'}
      >
        ← Back
      </Link>
      <PageHead title="New user" />
      <Section>
        <UserForm onDone={() => router.push('/users')} />
      </Section>
    </PageContainer>
  );
}
