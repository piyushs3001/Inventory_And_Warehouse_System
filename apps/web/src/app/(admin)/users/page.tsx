'use client';

import { useState } from 'react';
import { useUsersControllerFindAll } from '@/lib/api/generated/users/users';
import { UserStatus } from '@/lib/api/generated/model';
import type { UserDto } from '@/lib/api/generated/model';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import { UserFormDialog } from './user-form-dialog';
import { AssignWarehousesDialog } from './assign-warehouses-dialog';

export default function UsersPage() {
  const { data: users, isLoading } = useUsersControllerFindAll();
  const [editing, setEditing] = useState<UserDto | null>(null);
  const [creating, setCreating] = useState(false);
  const [assigning, setAssigning] = useState<UserDto | null>(null);

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Users</h1>
        <Button onClick={() => setCreating(true)}>New user</Button>
      </div>

      {isLoading ? (
        <p>Loading…</p>
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Email</TableHead>
              <TableHead>Role</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Warehouses</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {(users ?? []).map((u) => (
              <TableRow key={u.id}>
                <TableCell>{u.name}</TableCell>
                <TableCell>{u.email}</TableCell>
                <TableCell>{u.role}</TableCell>
                <TableCell>
                  <Badge variant={u.status === UserStatus.ACTIVE ? 'default' : 'secondary'}>
                    {u.status}
                  </Badge>
                </TableCell>
                <TableCell>{u.warehouses.map((w) => w.name).join(', ') || '—'}</TableCell>
                <TableCell className="space-x-2 text-right">
                  <Button variant="outline" size="sm" onClick={() => setEditing(u)}>Edit</Button>
                  <Button variant="outline" size="sm" onClick={() => setAssigning(u)}>Scope</Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}

      {creating && <UserFormDialog onClose={() => setCreating(false)} />}
      {editing && <UserFormDialog user={editing} onClose={() => setEditing(null)} />}
      {assigning && <AssignWarehousesDialog user={assigning} onClose={() => setAssigning(null)} />}
    </div>
  );
}
