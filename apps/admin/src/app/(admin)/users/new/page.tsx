'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { buttonVariants, PageHead } from '@iws/ui';
import { UserForm } from '../user-form';

export default function NewUserPage() {
  const router = useRouter();
  return (
    <div className="mx-auto flex w-full max-w-2xl flex-col gap-4">
      <Link
        href="/users"
        className={buttonVariants({ variant: 'ghost', size: 'sm' }) + ' self-start'}
      >
        ← Back
      </Link>
      <PageHead title="New user" />
      <div className="rounded-xl bg-card p-6 ring-1 ring-foreground/10">
        <UserForm onDone={() => router.push('/users')} />
      </div>
    </div>
  );
}
