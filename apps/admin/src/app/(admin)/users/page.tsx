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
import { toast } from 'sonner';
import type { StatusTone, DataTableColumn } from '@iws/ui';
import {
  buttonVariants,
  Button,
  PageHead,
  StatusBadge,
  EmptyState,
  DataTable,
  EntityAvatar,
  RowActions,
  useConfirm,
} from '@iws/ui';
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
  const confirm = useConfirm();
  const { data: users, isLoading } = useUsersControllerFindAll();
  const [assigning, setAssigning] = useState<UserDto | null>(null);

  const queryClient = useQueryClient();
  const deactivate = useUsersControllerDeactivate();
  const activate = useUsersControllerActivate();

  const invalidateList = (): Promise<void> =>
    queryClient.invalidateQueries({ queryKey: getUsersControllerFindAllQueryKey() });

  const onDeactivate = async (id: string, name: string): Promise<void> => {
    const ok = await confirm({
      title: 'Deactivate user?',
      description: `"${name}" will lose access immediately.`,
      confirmLabel: 'Deactivate',
      tone: 'danger',
    });
    if (!ok) return;
    try {
      await deactivate.mutateAsync({ id });
      await invalidateList();
      toast.success('User deactivated');
    } catch {
      toast.error('Could not deactivate user');
    }
  };

  const onActivate = async (id: string): Promise<void> => {
    try {
      await activate.mutateAsync({ id });
      await invalidateList();
      toast.success('User activated');
    } catch {
      toast.error('Could not activate user');
    }
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
        <div className="flex items-center justify-end gap-2">
          {u.status === UserStatus.PENDING_APPROVAL && (
            <Button size="sm" onClick={() => onActivate(u.id)}>Approve</Button>
          )}
          {u.status === UserStatus.INACTIVE && (
            <Button variant="outline" size="sm" onClick={() => onActivate(u.id)}>
              Reactivate
            </Button>
          )}
          <Button variant="outline" size="sm" onClick={() => setAssigning(u)}>
            Assign warehouses
          </Button>
          <RowActions
            editHref={`/users/${u.id}/edit`}
            onDelete={
              u.status === UserStatus.ACTIVE
                ? () => onDeactivate(u.id, u.name)
                : undefined
            }
            labels={{ delete: 'Deactivate' }}
          />
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
