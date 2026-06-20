'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useQueryClient } from '@tanstack/react-query';
import {
  useWarehousesControllerList,
  useWarehousesControllerArchive,
  getWarehousesControllerListQueryKey,
} from '@iws/api-client';
import { useUsersControllerFindAll } from '@iws/api-client';
import { WarehouseStatus } from '@iws/api-client';
import type { WarehouseDto } from '@iws/api-client';
import { Button, buttonVariants } from '@iws/ui';
import { PageHead } from '@iws/ui';
import { StatusBadge } from '@iws/ui';
import { EmptyState } from '@iws/ui';
import { EntityAvatar } from '@iws/ui';
import { Checkbox, Label } from '@iws/ui';
import { DataTable, type DataTableColumn } from '@iws/ui';
import { AssignStaffDialog } from './assign-staff-dialog';

export default function WarehousesPage() {
  const [includeArchived, setIncludeArchived] = useState(false);
  const { data: warehouses, isLoading } = useWarehousesControllerList(
    includeArchived ? { includeArchived: true } : undefined,
  );
  const { data: users } = useUsersControllerFindAll();
  const [assigning, setAssigning] = useState<WarehouseDto | null>(null);

  const queryClient = useQueryClient();
  const archive = useWarehousesControllerArchive();

  const invalidateList = async (): Promise<void> => {
    await queryClient.invalidateQueries({
      queryKey: getWarehousesControllerListQueryKey(
        includeArchived ? { includeArchived: true } : undefined,
      ),
    });
  };

  const onArchive = async (id: string): Promise<void> => {
    if (!confirm('Archive this warehouse?')) return;
    await archive.mutateAsync({ id });
    await invalidateList();
  };

  const columns: DataTableColumn<WarehouseDto>[] = [
    {
      key: 'name',
      header: 'Name',
      cell: (w) => (
        <div className="flex items-center gap-2.5">
          <EntityAvatar name={w.name} />
          <span className="text-[13px] font-semibold">{w.name}</span>
        </div>
      ),
      sortValue: (w) => w.name,
    },
    {
      key: 'status',
      header: 'Status',
      cell: (w) => (
        <StatusBadge tone={w.status === WarehouseStatus.ACTIVE ? 'ok' : 'muted'}>
          {w.status}
        </StatusBadge>
      ),
      sortValue: (w) => w.status,
    },
    {
      key: 'capacity',
      header: 'Capacity',
      align: 'right',
      className: 'font-mono tabular-nums',
      cell: (w) => w.capacity ?? '—',
      sortValue: (w) => w.capacity ?? 0,
    },
    {
      key: 'contact',
      header: 'Contact',
      cell: (w) => w.contactPerson ?? '—',
    },
    {
      key: 'actions',
      header: 'Actions',
      align: 'right',
      cell: (w) => (
        <div className="flex justify-end gap-2">
          <Link
            className={buttonVariants({ variant: 'outline', size: 'sm' })}
            href={`/warehouses/${w.id}/edit`}
          >
            Edit
          </Link>
          <Button variant="outline" size="sm" onClick={() => setAssigning(w)}>
            Assign staff
          </Button>
          {w.status === WarehouseStatus.ACTIVE && (
            <Button variant="outline" size="sm" onClick={() => onArchive(w.id)}>
              Archive
            </Button>
          )}
        </div>
      ),
    },
  ];

  return (
    <div className="flex flex-col gap-4">
      <PageHead
        title="Warehouses"
        actions={
          <Link className={buttonVariants()} href="/warehouses/new">
            New warehouse
          </Link>
        }
      />

      <DataTable
        rows={warehouses ?? []}
        getRowKey={(w) => w.id}
        isLoading={isLoading}
        columns={columns}
        searchPlaceholder="Search warehouses…"
        searchFilter={(w, q) => w.name.toLowerCase().includes(q)}
        toolbar={
          <Label className="flex items-center gap-2 text-sm font-normal text-muted-foreground">
            <Checkbox
              checked={includeArchived}
              onCheckedChange={(v) => setIncludeArchived(v === true)}
            />
            Include archived
          </Label>
        }
        empty={
          <EmptyState
            title="No warehouses"
            description="Create a warehouse to start tracking stock."
            action={
              <Link className={buttonVariants()} href="/warehouses/new">
                New warehouse
              </Link>
            }
          />
        }
      />

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
