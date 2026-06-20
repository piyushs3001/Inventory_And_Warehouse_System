'use client';

import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { buttonVariants } from '@iws/ui';
import { PageHead } from '@iws/ui';
import { WarehouseForm } from '../warehouse-form';

export default function NewWarehousePage() {
  const router = useRouter();
  return (
    <div className="mx-auto flex w-full max-w-2xl flex-col gap-4">
      <Link
        href="/warehouses"
        className={buttonVariants({ variant: 'ghost', size: 'sm' }) + ' self-start'}
      >
        ← Back
      </Link>
      <PageHead title="New warehouse" />
      <div className="rounded-xl bg-card p-6 ring-1 ring-foreground/10">
        <WarehouseForm onDone={() => router.push('/warehouses')} />
      </div>
    </div>
  );
}
