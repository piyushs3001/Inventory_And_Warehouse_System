'use client';

import { useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import {
  useWarehousesControllerList,
  useWarehousesControllerArchive,
  getWarehousesControllerListQueryKey,
} from '@/lib/api/generated/warehouses/warehouses';
import { useUsersControllerFindAll } from '@/lib/api/generated/users/users';
import { WarehouseStatus } from '@/lib/api/generated/model';
import type { WarehouseDto } from '@/lib/api/generated/model';
import { Button } from '@/components/ui/button';
import { PageHead } from '@/components/ui/page-head';
import { StatusBadge } from '@/components/ui/status-badge';
import { EmptyState } from '@/components/ui/empty-state';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import { WarehouseFormDialog } from './warehouse-form-dialog';
import { AssignStaffDialog } from './assign-staff-dialog';

export default function WarehousesPage() {
  const [includeArchived, setIncludeArchived] = useState(false);
  const { data: warehouses, isLoading } = useWarehousesControllerList(
    includeArchived ? { includeArchived: true } : undefined,
  );
  const { data: users } = useUsersControllerFindAll();
  const [editing, setEditing] = useState<WarehouseDto | null>(null);
  const [creating, setCreating] = useState(false);
  const [assigning, setAssigning] = useState<WarehouseDto | null>(null);

  const queryClient = useQueryClient();
  const archive = useWarehousesControllerArchive();

  const onArchive = async (id: string): Promise<void> => {
    if (!confirm('Archive this warehouse?')) return;
    await archive.mutateAsync({ id });
    await queryClient.invalidateQueries({
      queryKey: getWarehousesControllerListQueryKey(
        includeArchived ? { includeArchived: true } : undefined,
      ),
    });
  };

  const invalidateList = async (): Promise<void> => {
    await queryClient.invalidateQueries({
      queryKey: getWarehousesControllerListQueryKey(
        includeArchived ? { includeArchived: true } : undefined,
      ),
    });
  };

  return (
    <div className="flex flex-col gap-4">
      <PageHead
        title="Warehouses"
        actions={
          <>
            <label className="flex items-center gap-2 text-sm text-muted-foreground">
              <input type="checkbox" checked={includeArchived} onChange={(e) => setIncludeArchived(e.target.checked)} />
              Include archived
            </label>
            <Button onClick={() => setCreating(true)}>New warehouse</Button>
          </>
        }
      />

      {isLoading ? (
        <div className="flex flex-col gap-2">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-12 w-full" />
          ))}
        </div>
      ) : (warehouses ?? []).length === 0 ? (
        <EmptyState
          title="No warehouses"
          description="Create a warehouse to start tracking stock."
          action={<Button onClick={() => setCreating(true)}>New warehouse</Button>}
        />
      ) : (
        <div className="rounded-xl bg-card ring-1 ring-foreground/10 overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Capacity</TableHead>
                <TableHead>Contact</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {(warehouses ?? []).map((w) => (
                <TableRow key={w.id}>
                  <TableCell>{w.name}</TableCell>
                  <TableCell>
                    <StatusBadge tone={w.status === WarehouseStatus.ACTIVE ? 'ok' : 'muted'}>{w.status}</StatusBadge>
                  </TableCell>
                  <TableCell className="text-right font-mono tabular-nums">{w.capacity ?? '—'}</TableCell>
                  <TableCell>{w.contactPerson ?? '—'}</TableCell>
                  <TableCell className="space-x-2 text-right">
                    <Button variant="outline" size="sm" onClick={() => setEditing(w)}>Edit</Button>
                    <Button variant="outline" size="sm" onClick={() => setAssigning(w)}>Assign staff</Button>
                    {w.status === WarehouseStatus.ACTIVE && (
                      <Button variant="outline" size="sm" onClick={() => onArchive(w.id)}>Archive</Button>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      {creating && (
        <WarehouseFormDialog
          onClose={() => setCreating(false)}
          onSuccess={invalidateList}
        />
      )}
      {editing && (
        <WarehouseFormDialog
          warehouse={editing}
          onClose={() => setEditing(null)}
          onSuccess={invalidateList}
        />
      )}
      {assigning && (
        <AssignStaffDialog
          warehouse={assigning}
          currentStaffIds={
            (users ?? [])
              .filter((u) => u.warehouses.some((w) => w.id === assigning.id))
              .map((u) => u.id)
          }
          onClose={() => setAssigning(null)}
          onSuccess={invalidateList}
        />
      )}
    </div>
  );
}
