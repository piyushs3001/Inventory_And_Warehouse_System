'use client';

import { useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  useWarehousesControllerList,
  useProductsControllerList,
} from '@iws/api-client';
import { buttonVariants, PageContainer, PageHead, Section, Skeleton } from '@iws/ui';
import { RequestTransferForm } from '../request-transfer-form';

export default function NewTransferPage() {
  const router = useRouter();
  const { data: warehouses, isLoading: loadingWarehouses } = useWarehousesControllerList();
  const { data: products, isLoading: loadingProducts } = useProductsControllerList();
  const loading = loadingWarehouses || loadingProducts;

  return (
    <PageContainer>
      <Link href="/transfers" className={buttonVariants({ variant: 'ghost', size: 'sm' }) + ' self-start'}>← Back</Link>
      <PageHead title="Request transfer" />
      <Section>
        {loading ? (
          <div className="flex flex-col gap-3">
            {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-10 w-full" />)}
          </div>
        ) : (
          <RequestTransferForm
            warehouses={warehouses ?? []}
            products={products ?? []}
            onDone={() => router.push('/transfers')}
          />
        )}
      </Section>
    </PageContainer>
  );
}
