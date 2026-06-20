'use client';

import { useState } from 'react';
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
  PageHead,
  StatusBadge,
  EmptyState,
  Skeleton,
  Input,
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
  EntityAvatar,
} from '@iws/ui';
import { SupplierFormDialog } from './supplier-form-dialog';
import { SupplierPerformanceDialog } from './supplier-performance-dialog';

export default function SuppliersPage() {
  const [search, setSearch] = useState('');
  const [includeInactive, setIncludeInactive] = useState(false);
  const params = {
    ...(search ? { search } : {}),
    ...(includeInactive ? { includeInactive: true } : {}),
  };
  const { data: suppliers, isLoading } = useSuppliersControllerList(params);
  const [editing, setEditing] = useState<SupplierDto | null>(null);
  const [creating, setCreating] = useState(false);
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

  return (
    <div className="flex flex-col gap-4">
      <PageHead
        title="Suppliers"
        actions={<Button onClick={() => setCreating(true)}>New supplier</Button>}
      />

      <div className="flex flex-wrap items-center gap-3">
        <Input
          aria-label="Search suppliers"
          placeholder="Search by name or contact…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="max-w-xs"
        />
        <label className="flex items-center gap-2 text-sm text-muted-foreground">
          <input type="checkbox" checked={includeInactive} onChange={(e) => setIncludeInactive(e.target.checked)} />
          Include inactive
        </label>
      </div>

      {isLoading ? (
        <div className="flex flex-col gap-2">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-12 w-full" />
          ))}
        </div>
      ) : list.length === 0 ? (
        <EmptyState
          title={search ? 'No matches' : 'No suppliers'}
          description={search ? 'No suppliers match your search.' : 'Add a supplier to start raising purchase orders.'}
          action={<Button onClick={() => setCreating(true)}>New supplier</Button>}
        />
      ) : (
        <div className="rounded-xl bg-card ring-1 ring-foreground/10 overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Contact</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Phone</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {list.map((s) => (
                <TableRow key={s.id}>
                  <TableCell>
                    <div className="flex items-center gap-2.5">
                      <EntityAvatar name={s.name} />
                      <div className="text-[13px] font-semibold">{s.name}</div>
                    </div>
                  </TableCell>
                  <TableCell>{s.contactName ?? '—'}</TableCell>
                  <TableCell className="text-sm">{s.email ?? '—'}</TableCell>
                  <TableCell className="text-sm">{s.phone ?? '—'}</TableCell>
                  <TableCell>
                    <StatusBadge tone={s.status === SupplierStatus.ACTIVE ? 'ok' : 'muted'}>{s.status}</StatusBadge>
                  </TableCell>
                  <TableCell className="space-x-2 text-right">
                    <Button variant="outline" size="sm" onClick={() => setPerf(s)}>Performance</Button>
                    <Button variant="outline" size="sm" onClick={() => setEditing(s)}>Edit</Button>
                    {s.status === SupplierStatus.ACTIVE && (
                      <Button variant="outline" size="sm" onClick={() => onDeactivate(s.id)}>Deactivate</Button>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      {creating && (
        <SupplierFormDialog onClose={() => setCreating(false)} onSuccess={invalidate} />
      )}
      {editing && (
        <SupplierFormDialog supplier={editing} onClose={() => setEditing(null)} onSuccess={invalidate} />
      )}
      {perf && (
        <SupplierPerformanceDialog supplierId={perf.id} supplierName={perf.name} onClose={() => setPerf(null)} />
      )}
    </div>
  );
}
