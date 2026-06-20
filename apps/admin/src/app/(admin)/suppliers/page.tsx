'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useQueryClient } from '@tanstack/react-query';
import {
  useSuppliersControllerList,
  useSuppliersControllerDeactivate,
  getSuppliersControllerListQueryKey,
  SupplierStatus,
} from '@iws/api-client';
import type { SupplierDto } from '@iws/api-client';
import {
  Button,
  buttonVariants,
  PageHead,
  StatusBadge,
  EmptyState,
  EntityAvatar,
  DataTable,
  type DataTableColumn,
} from '@iws/ui';
import { SupplierPerformanceDialog } from './supplier-performance-dialog';

export default function SuppliersPage() {
  const [includeInactive, setIncludeInactive] = useState(false);
  const params = {
    ...(includeInactive ? { includeInactive: true } : {}),
  };
  const { data: suppliers, isLoading } = useSuppliersControllerList(params);
  const [perf, setPerf] = useState<SupplierDto | null>(null);

  const queryClient = useQueryClient();
  const deactivate = useSuppliersControllerDeactivate();
  const list = suppliers ?? [];

  const invalidate = async (): Promise<void> => {
    await queryClient.invalidateQueries({
      queryKey: getSuppliersControllerListQueryKey(params),
    });
  };

  const onDeactivate = async (id: string): Promise<void> => {
    if (!confirm('Deactivate this supplier? Purchase history is preserved.')) return;
    await deactivate.mutateAsync({ id });
    await invalidate();
  };

  const columns: DataTableColumn<SupplierDto>[] = [
    {
      key: 'name',
      header: 'Name',
      cell: (s) => (
        <div className="flex items-center gap-2.5">
          <EntityAvatar name={s.name} />
          <span className="text-[13px] font-semibold">{s.name}</span>
        </div>
      ),
      sortValue: (s) => s.name,
    },
    {
      key: 'contact',
      header: 'Contact',
      cell: (s) => s.contactName ?? '—',
      sortValue: (s) => s.contactName ?? '',
    },
    {
      key: 'email',
      header: 'Email',
      className: 'text-sm',
      cell: (s) => s.email ?? '—',
      sortValue: (s) => s.email ?? '',
    },
    {
      key: 'phone',
      header: 'Phone',
      className: 'text-sm',
      cell: (s) => s.phone ?? '—',
    },
    {
      key: 'status',
      header: 'Status',
      cell: (s) => (
        <StatusBadge tone={s.status === SupplierStatus.ACTIVE ? 'ok' : 'muted'}>{s.status}</StatusBadge>
      ),
      sortValue: (s) => s.status,
    },
    {
      key: 'actions',
      header: 'Actions',
      align: 'right',
      cell: (s) => (
        <div className="flex justify-end gap-2">
          <Button variant="outline" size="sm" onClick={() => setPerf(s)}>Performance</Button>
          <Link className={buttonVariants({ variant: 'outline', size: 'sm' })} href={`/suppliers/${s.id}/edit`}>Edit</Link>
          {s.status === SupplierStatus.ACTIVE && (
            <Button variant="outline" size="sm" onClick={() => onDeactivate(s.id)}>Deactivate</Button>
          )}
        </div>
      ),
    },
  ];

  return (
    <div className="flex flex-col gap-4">
      <PageHead
        title="Suppliers"
        actions={
          <Link className={buttonVariants()} href="/suppliers/new">New supplier</Link>
        }
      />

      <DataTable
        rows={list}
        getRowKey={(s) => s.id}
        isLoading={isLoading}
        columns={columns}
        searchPlaceholder="Search by name or contact…"
        searchFilter={(s, q) =>
          s.name.toLowerCase().includes(q) ||
          (s.contactName?.toLowerCase().includes(q) ?? false)
        }
        toolbar={
          <label className="flex items-center gap-2 text-sm text-muted-foreground">
            <input type="checkbox" checked={includeInactive} onChange={(e) => setIncludeInactive(e.target.checked)} />
            Include inactive
          </label>
        }
        empty={
          <EmptyState
            title="No suppliers"
            description="Add a supplier to start raising purchase orders."
            action={<Link className={buttonVariants()} href="/suppliers/new">New supplier</Link>}
          />
        }
      />

      {perf && (
        <SupplierPerformanceDialog supplierId={perf.id} supplierName={perf.name} onClose={() => setPerf(null)} />
      )}
    </div>
  );
}
