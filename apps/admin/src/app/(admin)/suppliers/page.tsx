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
import { toast } from 'sonner';
import {
  buttonVariants,
  PageHead,
  StatusBadge,
  EmptyState,
  EntityAvatar,
  DataTable,
  Checkbox,
  Label,
  RowActions,
  useConfirm,
  type DataTableColumn,
} from '@iws/ui';
import { SupplierPerformanceDialog } from './supplier-performance-dialog';

export default function SuppliersPage() {
  const confirm = useConfirm();
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

  const onDeactivate = async (id: string, name: string): Promise<void> => {
    const ok = await confirm({
      title: 'Deactivate supplier?',
      description: `"${name}" will be deactivated. Purchase history is preserved.`,
      confirmLabel: 'Deactivate',
      tone: 'danger',
    });
    if (!ok) return;
    try {
      await deactivate.mutateAsync({ id });
      await invalidate();
      toast.success('Supplier deactivated');
    } catch {
      toast.error('Could not deactivate supplier');
    }
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
        <RowActions
          onView={() => setPerf(s)}
          editHref={`/suppliers/${s.id}/edit`}
          onDelete={s.status === SupplierStatus.ACTIVE ? () => onDeactivate(s.id, s.name) : undefined}
          labels={{ view: 'Performance', delete: 'Deactivate' }}
        />
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
          <Label className="flex items-center gap-2 text-sm font-normal text-muted-foreground">
            <Checkbox
              checked={includeInactive}
              onCheckedChange={(v) => setIncludeInactive(v === true)}
            />
            Include inactive
          </Label>
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
