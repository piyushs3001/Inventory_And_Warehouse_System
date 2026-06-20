'use client';

import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { useUsersControllerFindOne } from '@iws/api-client';
import { buttonVariants, ErrorState, PageHead, Skeleton } from '@iws/ui';
import { UserForm } from '../../user-form';

export default function EditUserPage() {
  const router = useRouter();
  const params = useParams<{ id: string }>();
  const id = params.id;
  const { data: user, isLoading, isError } = useUsersControllerFindOne(id);

  return (
    <div className="mx-auto flex w-full max-w-2xl flex-col gap-4">
      <Link
        href="/users"
        className={buttonVariants({ variant: 'ghost', size: 'sm' }) + ' self-start'}
      >
        ← Back
      </Link>
      <PageHead title="Edit user" />
      <div className="rounded-xl bg-card p-6 ring-1 ring-foreground/10">
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
      </div>
    </div>
  );
}
