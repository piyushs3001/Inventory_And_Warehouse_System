'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { buttonVariants, PageHead } from '@iws/ui';
import { CountForm } from '../count-form';

export default function NewCountPage() {
  const router = useRouter();
  return (
    <div className="mx-auto flex w-full max-w-2xl flex-col gap-4">
      <Link href="/counting" className={buttonVariants({ variant: 'ghost', size: 'sm' }) + ' self-start'}>← Back</Link>
      <PageHead title="New stock count" />
      <div className="rounded-xl bg-card p-6 ring-1 ring-foreground/10">
        <CountForm onDone={(id) => router.push(`/counting/${id}`)} />
      </div>
    </div>
  );
}
