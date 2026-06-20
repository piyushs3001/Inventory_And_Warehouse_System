'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { buttonVariants, PageHead } from '@iws/ui';
import { SupplierForm } from '../supplier-form';

export default function NewSupplierPage() {
  const router = useRouter();
  return (
    <div className="mx-auto flex w-full max-w-2xl flex-col gap-4">
      <Link
        href="/suppliers"
        className={buttonVariants({ variant: 'ghost', size: 'sm' }) + ' self-start'}
      >
        ← Back
      </Link>
      <PageHead title="New supplier" />
      <div className="rounded-xl bg-card p-6 ring-1 ring-foreground/10">
        <SupplierForm onDone={() => router.push('/suppliers')} />
      </div>
    </div>
  );
}
