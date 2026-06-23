'use client';

import { useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { useQueryClient } from '@tanstack/react-query';
import {
  useStockCountsControllerFindOne,
  getStockCountsControllerFindOneQueryKey,
  useStockCountsControllerEnterCounts,
  StockCountStatus,
} from '@iws/api-client';
import {
  Button,
  buttonVariants,
  Field,
  Input,
  PageContainer,
  PageHead,
  Section,
  StatusBadge,
  Skeleton,
  ErrorState,
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@iws/ui';
import { COUNT_STATUS_TONE } from '../count-status';

// Staff enter counted quantities. Reconcile is manager/admin-only and not shown.
export default function StaffCountDetailPage() {
  const id = useParams().id as string;
  const queryClient = useQueryClient();
  const { data: count, isLoading, isError } = useStockCountsControllerFindOne(id);
  const enter = useStockCountsControllerEnterCounts();
  const [draft, setDraft] = useState<Record<string, string>>({});
  const [error, setError] = useState<string | null>(null);

  const refresh = async (): Promise<void> => {
    await queryClient.invalidateQueries({ queryKey: getStockCountsControllerFindOneQueryKey(id) });
  };

  if (isLoading) return <Skeleton className="h-64 w-full" />;
  if (isError || !count) return <ErrorState title="Stock count not found" description="It may not exist or be outside your scope." />;

  const isOpen = count.status === StockCountStatus.OPEN;
  const valueFor = (productId: string, counted: number | null | undefined): string =>
    draft[productId] ?? (counted == null ? '' : String(counted));

  const saveCounts = async (): Promise<void> => {
    setError(null);
    const entries = count.lines
      .map((l) => ({ productId: l.productId, raw: draft[l.productId] }))
      .filter((e) => e.raw !== undefined && e.raw !== '')
      .map((e) => ({ productId: e.productId, countedQty: Number(e.raw) }));
    if (entries.length === 0) {
      setError('Enter at least one counted quantity');
      return;
    }
    if (entries.some((e) => !Number.isInteger(e.countedQty) || e.countedQty < 0)) {
      setError('Counts must be whole numbers of 0 or more');
      return;
    }
    try {
      await enter.mutateAsync({ id, data: { entries } });
      setDraft({});
      await refresh();
    } catch (err) {
      const m = (err as { response?: { data?: { message?: string } } })?.response?.data?.message;
      setError(typeof m === 'string' ? m : 'Could not save counts');
    }
  };

  const varianceTone = (v: number): 'ok' | 'warn' | 'danger' => (v === 0 ? 'ok' : v > 0 ? 'warn' : 'danger');

  return (
    <PageContainer>
      <PageHead
        title={
          <span className="flex items-center gap-3">
            {count.code}
            <StatusBadge tone={COUNT_STATUS_TONE[count.status]}>{count.status}</StatusBadge>
          </span>
        }
        actions={
          <div className="flex items-center gap-2">
            <Link href="/counting" className={buttonVariants({ variant: 'outline', size: 'sm' })}>Back</Link>
            {isOpen && <Button size="sm" disabled={enter.isPending} onClick={saveCounts}>Save counts</Button>}
          </div>
        }
      />

      <Section title="Details">
        <div className="grid grid-cols-2 gap-x-8 gap-y-3 sm:grid-cols-4">
          <Field label="Warehouse">{count.warehouseName}</Field>
        </div>
      </Section>

      {error && <p role="alert" className="text-sm text-red-600">{error}</p>}

      <div className="rounded-xl bg-card ring-1 ring-foreground/10 overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Product</TableHead>
              <TableHead className="text-right">Recorded</TableHead>
              <TableHead className="text-right">Counted</TableHead>
              <TableHead className="text-right">Variance</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {count.lines.map((l) => (
              <TableRow key={l.productId}>
                <TableCell>
                  <div className="text-[13px] font-semibold">{l.productName}</div>
                  <div className="font-mono text-xs text-muted-foreground">{l.sku}</div>
                </TableCell>
                <TableCell className="text-right tabular-nums">{l.recordedQty}</TableCell>
                <TableCell className="text-right tabular-nums">
                  {isOpen ? (
                    <Input
                      aria-label={`Counted qty for ${l.sku}`}
                      type="number" min={0}
                      className="ml-auto w-24 text-right"
                      value={valueFor(l.productId, l.countedQty)}
                      onChange={(e) => setDraft((d) => ({ ...d, [l.productId]: e.target.value }))}
                    />
                  ) : (
                    (l.countedQty ?? '—')
                  )}
                </TableCell>
                <TableCell className="text-right tabular-nums">
                  {l.variance == null ? '—' : (
                    <StatusBadge tone={varianceTone(l.variance)}>{l.variance > 0 ? `+${l.variance}` : l.variance}</StatusBadge>
                  )}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </PageContainer>
  );
}
