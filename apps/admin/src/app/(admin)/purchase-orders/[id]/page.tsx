'use client';

import { useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { useQueryClient } from '@tanstack/react-query';
import {
  usePurchaseOrdersControllerFindOne,
  getPurchaseOrdersControllerFindOneQueryKey,
  usePurchaseOrdersControllerSend,
  usePurchaseOrdersControllerApprove,
  usePurchaseOrdersControllerCancel,
  usePurchaseOrdersControllerClose,
  PurchaseOrderStatus,
} from '@iws/api-client';
import {
  Button,
  buttonVariants,
  Field,
  PageContainer,
  PageHead,
  Section,
  StatusBadge,
  Skeleton,
  ErrorState,
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@iws/ui';
import { PO_STATUS_TONE } from '../po-status';

export default function PurchaseOrderDetailPage() {
  const params = useParams();
  const id = params.id as string;
  const queryClient = useQueryClient();

  const { data: po, isLoading, isError } = usePurchaseOrdersControllerFindOne(id);
  const send = usePurchaseOrdersControllerSend();
  const approve = usePurchaseOrdersControllerApprove();
  const cancel = usePurchaseOrdersControllerCancel();
  const close = usePurchaseOrdersControllerClose();
  const [error, setError] = useState<string | null>(null);

  const refresh = async (): Promise<void> => {
    await queryClient.invalidateQueries({
      queryKey: getPurchaseOrdersControllerFindOneQueryKey(id),
    });
  };

  const act = async (fn: () => Promise<unknown>): Promise<void> => {
    setError(null);
    try {
      await fn();
      await refresh();
    } catch (err) {
      const message = (err as { response?: { data?: { message?: string } } })?.response?.data?.message;
      setError(typeof message === 'string' ? message : 'Action failed');
    }
  };

  if (isLoading) return <Skeleton className="h-64 w-full" />;
  if (isError || !po) return <ErrorState title="Purchase order not found" description="It may not exist or be outside your scope." />;

  const pending = send.isPending || approve.isPending || cancel.isPending || close.isPending;
  const canSend = po.status === PurchaseOrderStatus.DRAFT;
  const canApprove = po.status === PurchaseOrderStatus.SENT;
  const canCancel = po.status === PurchaseOrderStatus.DRAFT || po.status === PurchaseOrderStatus.SENT;
  const canClose = po.status === PurchaseOrderStatus.PARTIALLY_RECEIVED;

  return (
    <PageContainer>
      <PageHead
        title={
          <span className="flex items-center gap-3">
            {po.code}
            <StatusBadge tone={PO_STATUS_TONE[po.status]}>{po.status.replace(/_/g, ' ')}</StatusBadge>
          </span>
        }
        actions={
          <div className="flex items-center gap-2">
            <Link href="/purchase-orders" className={buttonVariants({ variant: 'outline', size: 'sm' })}>Back</Link>
            {canSend && <Button size="sm" disabled={pending} onClick={() => act(() => send.mutateAsync({ id }))}>Send</Button>}
            {canApprove && <Button size="sm" disabled={pending} onClick={() => act(() => approve.mutateAsync({ id }))}>Approve</Button>}
            {canCancel && <Button size="sm" variant="destructive" disabled={pending} onClick={() => act(() => cancel.mutateAsync({ id }))}>Cancel</Button>}
            {canClose && <Button size="sm" variant="outline" disabled={pending} onClick={() => act(() => close.mutateAsync({ id }))}>Close out</Button>}
          </div>
        }
      />

      <Section title="Details">
        <div className="grid grid-cols-2 gap-x-8 gap-y-3 sm:grid-cols-4">
          <Field label="Supplier">{po.supplierName}</Field>
          <Field label="Warehouse">{po.warehouseName}</Field>
          <Field label="Total cost"><span className="font-mono tabular-nums">{po.totalCost}</span></Field>
          <Field label="Expected">{po.expectedDate ? new Date(po.expectedDate).toLocaleDateString() : '—'}</Field>
          <Field label="Created by">{po.createdByName ?? '—'}</Field>
          <Field label="Approved by">{po.approvedByName ?? '—'}</Field>
          <Field label="Notes">{po.notes ?? '—'}</Field>
        </div>
      </Section>

      {error && <p role="alert" className="text-sm text-red-600">{error}</p>}

      <div className="rounded-xl bg-card ring-1 ring-foreground/10 overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Product</TableHead>
              <TableHead className="text-right">Ordered</TableHead>
              <TableHead className="text-right">Received</TableHead>
              <TableHead className="text-right">Damaged</TableHead>
              <TableHead className="text-right">Outstanding</TableHead>
              <TableHead className="text-right">Unit cost</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {po.lines.map((l) => (
              <TableRow key={l.id}>
                <TableCell>
                  <div className="text-[13px] font-semibold">{l.productName}</div>
                  <div className="font-mono text-xs text-muted-foreground">{l.sku}</div>
                </TableCell>
                <TableCell className="text-right tabular-nums">{l.quantity}</TableCell>
                <TableCell className="text-right tabular-nums">{l.receivedQty}</TableCell>
                <TableCell className="text-right tabular-nums">{l.damagedQty}</TableCell>
                <TableCell className="text-right tabular-nums">{l.outstandingQty}</TableCell>
                <TableCell className="text-right font-mono tabular-nums">{l.unitCost}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      <p className="text-sm text-muted-foreground">
        {'Goods are received on the Staff app\'s "Receive Stock" screen. This view reflects ordered-vs-received reconciliation.'}
      </p>
    </PageContainer>
  );
}
