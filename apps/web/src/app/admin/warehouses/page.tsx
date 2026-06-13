'use client';

import { useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import {
  useWarehousesControllerList,
  useWarehousesControllerArchive,
  getWarehousesControllerListQueryKey,
} from '@/lib/api/generated/warehouses/warehouses';
import { WarehouseStatus } from '@/lib/api/generated/model';
import type { WarehouseDto } from '@/lib/api/generated/model';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
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
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Warehouses</h1>
        <div className="flex items-center gap-3">
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={includeArchived}
              onChange={(e) => setIncludeArchived(e.target.checked)}
            />
            Include archived
          </label>
          <Button onClick={() => setCreating(true)}>New warehouse</Button>
        </div>
      </div>

      {isLoading ? (
        <p>Loading…</p>
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Capacity</TableHead>
              <TableHead>Contact</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {(warehouses ?? []).map((w) => (
              <TableRow key={w.id}>
                <TableCell>{w.name}</TableCell>
                <TableCell>
                  <Badge variant={w.status === WarehouseStatus.ACTIVE ? 'default' : 'secondary'}>
                    {w.status}
                  </Badge>
                </TableCell>
                <TableCell>{w.capacity ?? '—'}</TableCell>
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
          onClose={() => setAssigning(null)}
          onSuccess={invalidateList}
        />
      )}
    </div>
  );
}
