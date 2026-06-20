'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { buttonVariants, PageHead } from '@iws/ui';
import { CreatePoForm } from '../create-po-form';

export default function NewPurchaseOrderPage() {
  const router = useRouter();
  return (
    <div className="mx-auto flex w-full max-w-2xl flex-col gap-4">
      <Link href="/purchase-orders" className={buttonVariants({ variant: 'ghost', size: 'sm' }) + ' self-start'}>← Back</Link>
      <PageHead title="New purchase order" />
      <div className="rounded-xl bg-card p-6 ring-1 ring-foreground/10">
        <CreatePoForm onDone={() => router.push('/purchase-orders')} />
      </div>
    </div>
  );
}
