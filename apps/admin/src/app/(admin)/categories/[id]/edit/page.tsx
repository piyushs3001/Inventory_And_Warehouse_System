'use client';

import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { useCategoriesControllerList } from '@iws/api-client';
import { buttonVariants, ErrorState, PageContainer, PageHead, Section, Skeleton } from '@iws/ui';
import { CategoryForm } from '../../category-form';

export default function EditCategoryPage() {
  const router = useRouter();
  const params = useParams<{ id: string }>();
  const id = params.id;

  // No findOne hook exists — derive the category from the list by id.
  const { data: categories, isLoading, isError } = useCategoriesControllerList();
  const list = categories ?? [];
  const category = list.find((c) => c.id === id);

  return (
    <PageContainer>
      <Link
        href="/categories"
        className={buttonVariants({ variant: 'ghost', size: 'sm' }) + ' self-start'}
      >
        ← Back
      </Link>
      <PageHead title="Edit category" />
      <Section>
        {isLoading ? (
          <div className="flex flex-col gap-4">
            <Skeleton className="h-9 w-full" />
            <Skeleton className="h-9 w-full" />
          </div>
        ) : isError ? (
          <ErrorState description="Could not load categories." />
        ) : !category ? (
          <ErrorState
            title="Category not found"
            description="This category may have been deleted."
          />
        ) : (
          <CategoryForm
            category={category}
            categories={list}
            onDone={() => router.push('/categories')}
          />
        )}
      </Section>
    </PageContainer>
  );
}
