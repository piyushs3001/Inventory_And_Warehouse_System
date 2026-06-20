'use client';

import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { useWarehousesControllerFindOne } from '@iws/api-client';
import { buttonVariants } from '@iws/ui';
import { PageHead } from '@iws/ui';
import { Skeleton } from '@iws/ui';
import { ErrorState } from '@iws/ui';
import { WarehouseForm } from '../../warehouse-form';

export default function EditWarehousePage() {
  const router = useRouter();
  const params = useParams<{ id: string }>();
  const id = params.id;
  const { data: warehouse, isLoading, isError } = useWarehousesControllerFindOne(id);

  return (
    <div className="mx-auto flex w-full max-w-2xl flex-col gap-4">
      <Link
        href="/warehouses"
        className={buttonVariants({ variant: 'ghost', size: 'sm' }) + ' self-start'}
      >
        ← Back
      </Link>
      <PageHead title="Edit warehouse" />
      <div className="rounded-xl bg-card p-6 ring-1 ring-foreground/10">
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
      </div>
    </div>
  );
}
