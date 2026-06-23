'use client';

import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { useUsersControllerFindOne } from '@iws/api-client';
import { buttonVariants, ErrorState, PageContainer, PageHead, Section, Skeleton } from '@iws/ui';
import { UserForm } from '../../user-form';

export default function EditUserPage() {
  const router = useRouter();
  const params = useParams<{ id: string }>();
  const id = params.id;
  const { data: user, isLoading, isError } = useUsersControllerFindOne(id);

  return (
    <PageContainer>
      <Link
        href="/users"
        className={buttonVariants({ variant: 'ghost', size: 'sm' }) + ' self-start'}
      >
        ← Back
      </Link>
      <PageHead title="Edit user" />
      <Section>
        {isLoading ? (
          <div className="flex flex-col gap-4">
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
          </div>
        ) : isError || !user ? (
          <ErrorState
            title="User not found"
            description="This user could not be loaded."
          />
        ) : (
          <UserForm user={user} onDone={() => router.push('/users')} />
        )}
      </Section>
    </PageContainer>
  );
}
