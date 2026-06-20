'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useQueryClient } from '@tanstack/react-query';
import {
  useUsersControllerFindAll,
  useUsersControllerDeactivate,
  useUsersControllerActivate,
  getUsersControllerFindAllQueryKey,
} from '@iws/api-client';
import { UserStatus } from '@iws/api-client';
import type { UserDto } from '@iws/api-client';
import type { StatusTone, DataTableColumn } from '@iws/ui';
import { Button } from '@iws/ui';
import { buttonVariants } from '@iws/ui';
import { PageHead } from '@iws/ui';
import { StatusBadge } from '@iws/ui';
import { EmptyState } from '@iws/ui';
import { DataTable } from '@iws/ui';
import { EntityAvatar } from '@iws/ui';
import { AssignWarehousesDialog } from './assign-warehouses-dialog';

const STATUS_TONE: Record<UserStatus, StatusTone> = {
  [UserStatus.ACTIVE]: 'ok',
  [UserStatus.PENDING_APPROVAL]: 'warn',
  [UserStatus.INACTIVE]: 'muted',
};

const STATUS_LABEL: Record<UserStatus, string> = {
  [UserStatus.ACTIVE]: 'Active',
  [UserStatus.PENDING_APPROVAL]: 'Pending',
  [UserStatus.INACTIVE]: 'Inactive',
};

export default function UsersPage() {
  const { data: users, isLoading } = useUsersControllerFindAll();
  const [assigning, setAssigning] = useState<UserDto | null>(null);

  const queryClient = useQueryClient();
  const deactivate = useUsersControllerDeactivate();
  const activate = useUsersControllerActivate();
  const invalidateList = (): Promise<void> =>
    queryClient.invalidateQueries({ queryKey: getUsersControllerFindAllQueryKey() });
  const onDeactivate = async (id: string): Promise<void> => {
    await deactivate.mutateAsync({ id });
    await invalidateList();
  };
  const onActivate = async (id: string): Promise<void> => {
    await activate.mutateAsync({ id });
    await invalidateList();
  };

  const columns: DataTableColumn<UserDto>[] = [
    {
      key: 'name',
      header: 'Name',
      cell: (u) => (
        <div className="flex items-center gap-2.5">
          <EntityAvatar name={u.name} />
          <span className="text-[13px] font-semibold">{u.name}</span>
        </div>
      ),
      sortValue: (u) => u.name,
    },
    {
      key: 'email',
      header: 'Email',
      cell: (u) => <span className="font-mono text-[11px] text-faint">{u.email}</span>,
      sortValue: (u) => u.email,
    },
    {
      key: 'role',
      header: 'Role',
      cell: (u) => u.role,
      sortValue: (u) => u.role,
    },
    {
      key: 'status',
      header: 'Status',
      cell: (u) => (
        <StatusBadge tone={STATUS_TONE[u.status]}>{STATUS_LABEL[u.status]}</StatusBadge>
      ),
      sortValue: (u) => u.status,
    },
    {
      key: 'warehouses',
      header: 'Warehouses',
      cell: (u) => u.warehouses.map((w) => w.name).join(', ') || '—',
    },
    {
      key: 'actions',
      header: 'Actions',
      align: 'right',
      cell: (u) => (
        <div className="flex justify-end gap-2">
          <Link
            className={buttonVariants({ variant: 'outline', size: 'sm' })}
            href={`/users/${u.id}/edit`}
          >
            Edit
          </Link>
          <Button variant="outline" size="sm" onClick={() => setAssigning(u)}>
            Assign warehouses
          </Button>
          {u.status === UserStatus.PENDING_APPROVAL && (
            <Button size="sm" onClick={() => onActivate(u.id)}>Approve</Button>
          )}
          {u.status === UserStatus.INACTIVE && (
            <Button variant="outline" size="sm" onClick={() => onActivate(u.id)}>
              Reactivate
            </Button>
          )}
          {u.status === UserStatus.ACTIVE && (
            <Button variant="outline" size="sm" onClick={() => onDeactivate(u.id)}>
              Deactivate
            </Button>
          )}
        </div>
      ),
    },
  ];

  return (
    <div className="flex flex-col gap-4">
      <PageHead
        title="Users"
        actions={
          <Link className={buttonVariants()} href="/users/new">New user</Link>
        }
      />

      <DataTable
        rows={users ?? []}
        getRowKey={(u) => u.id}
        isLoading={isLoading}
        columns={columns}
        searchPlaceholder="Search by name or email…"
        searchFilter={(u, q) =>
          u.name.toLowerCase().includes(q) || u.email.toLowerCase().includes(q)
        }
        empty={
          <EmptyState
            title="No users yet"
            description="Create your first user to get started."
            action={
              <Link className={buttonVariants()} href="/users/new">New user</Link>
            }
          />
        }
      />

      {assigning && (
        <AssignWarehousesDialog user={assigning} onClose={() => setAssigning(null)} />
      )}
    </div>
  );
}
