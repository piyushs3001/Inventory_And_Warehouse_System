'use client';

import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useCategoriesControllerList } from '@iws/api-client';
import { buttonVariants, PageContainer, PageHead, Section } from '@iws/ui';
import { CategoryForm } from '../category-form';

export default function NewCategoryPage() {
  const router = useRouter();
  const { data: categories } = useCategoriesControllerList();

  return (
    <PageContainer>
      <Link
        href="/categories"
        className={buttonVariants({ variant: 'ghost', size: 'sm' }) + ' self-start'}
      >
        ← Back
      </Link>
      <PageHead title="New category" />
      <Section>
        <CategoryForm
          categories={categories ?? []}
          onDone={() => router.push('/categories')}
        />
      </Section>
    </PageContainer>
  );
}
