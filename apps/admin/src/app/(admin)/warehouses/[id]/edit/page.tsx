'use client';

import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { useWarehousesControllerFindOne } from '@iws/api-client';
import { buttonVariants, ErrorState, PageContainer, PageHead, Section, Skeleton } from '@iws/ui';
import { WarehouseForm } from '../../warehouse-form';

export default function EditWarehousePage() {
  const router = useRouter();
  const params = useParams<{ id: string }>();
  const id = params.id;
  const { data: warehouse, isLoading, isError } = useWarehousesControllerFindOne(id);

  return (
    <PageContainer>
      <Link
        href="/warehouses"
        className={buttonVariants({ variant: 'ghost', size: 'sm' }) + ' self-start'}
      >
        ← Back
      </Link>
      <PageHead title="Edit warehouse" />
      <Section>
        {isLoading ? (
          <div className="flex flex-col gap-4">
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
          </div>
        ) : isError || !warehouse ? (
          <ErrorState
            title="Warehouse not found"
            description="This warehouse could not be loaded."
          />
        ) : (
          <WarehouseForm
            warehouse={warehouse}
            onDone={() => router.push('/warehouses')}
          />
        )}
      </Section>
    </PageContainer>
  );
}
