'use client';

import { useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import {
  useUsersControllerFindAll,
  useUsersControllerDeactivate,
  getUsersControllerFindAllQueryKey,
} from '@/lib/api/generated/users/users';
import { UserStatus } from '@/lib/api/generated/model';
import type { UserDto } from '@/lib/api/generated/model';
import { Button } from '@/components/ui/button';
import { PageHead } from '@/components/ui/page-head';
import { StatusBadge } from '@/components/ui/status-badge';
import { EmptyState } from '@/components/ui/empty-state';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import { EntityAvatar } from '@/components/ui/entity-avatar';
import { UserFormDialog } from './user-form-dialog';
import { AssignWarehousesDialog } from './assign-warehouses-dialog';

export default function UsersPage() {
  const { data: users, isLoading } = useUsersControllerFindAll();
  const [editing, setEditing] = useState<UserDto | null>(null);
  const [creating, setCreating] = useState(false);
  const [assigning, setAssigning] = useState<UserDto | null>(null);

  const queryClient = useQueryClient();
  const deactivate = useUsersControllerDeactivate();
  const onDeactivate = async (id: string): Promise<void> => {
    await deactivate.mutateAsync({ id });
    await queryClient.invalidateQueries({ queryKey: getUsersControllerFindAllQueryKey() });
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
                    <StatusBadge tone={u.status === UserStatus.ACTIVE ? 'ok' : 'muted'}>{u.status}</StatusBadge>
                  </TableCell>
                  <TableCell>{u.warehouses.map((w) => w.name).join(', ') || '—'}</TableCell>
                  <TableCell className="space-x-2 text-right">
                    <Button variant="outline" size="sm" onClick={() => setEditing(u)}>Edit</Button>
                    <Button variant="outline" size="sm" onClick={() => setAssigning(u)}>Scope</Button>
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
