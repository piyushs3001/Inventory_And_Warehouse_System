'use client';

import { useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import {
  useUsersControllerFindAll,
  useUsersControllerDeactivate,
  useUsersControllerActivate,
  getUsersControllerFindAllQueryKey,
} from '@iws/api-client';
import { UserStatus } from '@iws/api-client';
import type { UserDto } from '@iws/api-client';
import type { StatusTone } from '@iws/ui';
import { Button } from '@iws/ui';
import { PageHead } from '@iws/ui';
import { StatusBadge } from '@iws/ui';
import { EmptyState } from '@iws/ui';
import { Skeleton } from '@iws/ui';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@iws/ui';
import { EntityAvatar } from '@iws/ui';
import { UserFormDialog } from './user-form-dialog';
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
  const [editing, setEditing] = useState<UserDto | null>(null);
  const [creating, setCreating] = useState(false);
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

  return (
    <div className="flex flex-col gap-4">
      <PageHead title="Users" actions={<Button onClick={() => setCreating(true)}>New user</Button>} />

      {isLoading ? (
        <div className="flex flex-col gap-2">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-12 w-full" />
          ))}
        </div>
      ) : (users ?? []).length === 0 ? (
        <EmptyState
          title="No users yet"
          description="Create your first user to get started."
          action={<Button onClick={() => setCreating(true)}>New user</Button>}
        />
      ) : (
        <div className="rounded-xl bg-card ring-1 ring-foreground/10 overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Role</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Warehouses</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {(users ?? []).map((u) => (
                <TableRow key={u.id}>
                  <TableCell>
                    <div className="flex items-center gap-2.5">
                      <EntityAvatar name={u.name} />
                      <div className="leading-tight">
                        <div className="text-[13px] font-semibold">{u.name}</div>
                        <div className="font-mono text-[11px] text-faint">{u.email}</div>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>{u.role}</TableCell>
                  <TableCell>
                    <StatusBadge tone={STATUS_TONE[u.status]}>{STATUS_LABEL[u.status]}</StatusBadge>
                  </TableCell>
                  <TableCell>{u.warehouses.map((w) => w.name).join(', ') || '—'}</TableCell>
                  <TableCell className="space-x-2 text-right">
                    <Button variant="outline" size="sm" onClick={() => setEditing(u)}>Edit</Button>
                    <Button variant="outline" size="sm" onClick={() => setAssigning(u)}>Scope</Button>
                    {u.status === UserStatus.PENDING_APPROVAL && (
                      <Button size="sm" onClick={() => onActivate(u.id)}>Approve</Button>
                    )}
                    {u.status === UserStatus.INACTIVE && (
                      <Button variant="outline" size="sm" onClick={() => onActivate(u.id)}>Reactivate</Button>
                    )}
                    {u.status === UserStatus.ACTIVE && (
                      <Button variant="outline" size="sm" onClick={() => onDeactivate(u.id)}>Deactivate</Button>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      {creating && <UserFormDialog onClose={() => setCreating(false)} />}
      {editing && <UserFormDialog user={editing} onClose={() => setEditing(null)} />}
      {assigning && <AssignWarehousesDialog user={assigning} onClose={() => setAssigning(null)} />}
    </div>
  );
}
