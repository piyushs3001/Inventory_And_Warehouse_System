'use client';

import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useCategoriesControllerList } from '@iws/api-client';
import { buttonVariants } from '@iws/ui';
import { PageHead } from '@iws/ui';
import { CategoryForm } from '../category-form';

export default function NewCategoryPage() {
  const router = useRouter();
  const { data: categories } = useCategoriesControllerList();

  return (
    <div className="mx-auto flex w-full max-w-2xl flex-col gap-4">
      <Link
        href="/categories"
        className={buttonVariants({ variant: 'ghost', size: 'sm' }) + ' self-start'}
      >
        ← Back
      </Link>
      <PageHead title="New category" />
      <div className="rounded-xl bg-card p-6 ring-1 ring-foreground/10">
        <CategoryForm
          categories={categories ?? []}
          onDone={() => router.push('/categories')}
        />
      </div>
    </div>
  );
}
