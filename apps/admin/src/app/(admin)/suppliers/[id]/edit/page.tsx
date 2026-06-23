'use client';

import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { useSuppliersControllerFindOne } from '@iws/api-client';
import { buttonVariants, ErrorState, PageContainer, PageHead, Section, Skeleton } from '@iws/ui';
import { SupplierForm } from '../../supplier-form';

export default function EditSupplierPage() {
  const router = useRouter();
  const params = useParams<{ id: string }>();
  const id = params.id;
  const { data: supplier, isLoading, isError } = useSuppliersControllerFindOne(id);

  return (
    <PageContainer>
      <Link
        href="/suppliers"
        className={buttonVariants({ variant: 'ghost', size: 'sm' }) + ' self-start'}
      >
        ← Back
      </Link>
      <PageHead title="Edit supplier" />
      <Section>
        {isLoading ? (
          <div className="flex flex-col gap-4">
            {Array.from({ length: 5 }).map((_, i) => (
              <Skeleton key={i} className="h-10 w-full" />
            ))}
          </div>
        ) : isError || !supplier ? (
          <ErrorState
            title="Supplier not found"
            description="This supplier could not be loaded."
            action={
              <Link href="/suppliers" className={buttonVariants({ variant: 'outline', size: 'sm' })}>
                Back to suppliers
              </Link>
            }
          />
        ) : (
          <SupplierForm supplier={supplier} onDone={() => router.push('/suppliers')} />
        )}
      </Section>
    </PageContainer>
  );
}
