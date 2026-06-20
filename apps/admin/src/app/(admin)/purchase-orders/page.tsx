'use client';

import { useState } from 'react';
import Link from 'next/link';
import {
  usePurchaseOrdersControllerList,
  PurchaseOrderStatus,
} from '@iws/api-client';
import type { PurchaseOrderDto } from '@iws/api-client';
import {
  buttonVariants,
  PageHead,
  StatusBadge,
  EmptyState,
  DataTable,
  SimpleSelect,
  type DataTableColumn,
} from '@iws/ui';
import { PO_STATUS_TONE } from './po-status';

export default function PurchaseOrdersPage() {
  const [status, setStatus] = useState('');

  const params = status ? { status: status as PurchaseOrderStatus } : {};
  const { data: orders, isLoading } = usePurchaseOrdersControllerList(params);
  const list = orders ?? [];

  const columns: DataTableColumn<PurchaseOrderDto>[] = [
    {
      key: 'code',
      header: 'Code',
      cell: (po) => <span className="font-mono text-xs font-semibold">{po.code}</span>,
      sortValue: (po) => po.code,
    },
    {
      key: 'supplier',
      header: 'Supplier',
      cell: (po) => po.supplierName,
      sortValue: (po) => po.supplierName,
    },
    {
      key: 'warehouse',
      header: 'Warehouse',
      cell: (po) => po.warehouseName,
      sortValue: (po) => po.warehouseName,
    },
    {
      key: 'status',
      header: 'Status',
      cell: (po) => (
        <StatusBadge tone={PO_STATUS_TONE[po.status]}>{po.status.replace(/_/g, ' ')}</StatusBadge>
      ),
      sortValue: (po) => po.status,
    },
    {
      key: 'lines',
      header: 'Lines',
      align: 'right',
      cell: (po) => <span className="tabular-nums">{po.lines.length}</span>,
      sortValue: (po) => po.lines.length,
    },
    {
      key: 'total',
      header: 'Total',
      align: 'right',
      cell: (po) => <span className="font-mono tabular-nums">{po.totalCost}</span>,
    },
    {
      key: 'actions',
      header: 'Actions',
      align: 'right',
      cell: (po) => (
        <div className="flex justify-end gap-2">
          <Link href={`/purchase-orders/${po.id}`} className={buttonVariants({ variant: 'outline', size: 'sm' })}>
            View
          </Link>
        </div>
      ),
    },
  ];

  return (
    <div className="flex flex-col gap-4">
      <PageHead
        title="Purchase Orders"
        actions={
          <Link className={buttonVariants()} href="/purchase-orders/new">New PO</Link>
        }
      />

      <DataTable
        rows={list}
        getRowKey={(po) => po.id}
        isLoading={isLoading}
        columns={columns}
        searchPlaceholder="Search by code or supplier…"
        searchFilter={(po, q) =>
          po.code.toLowerCase().includes(q) || po.supplierName.toLowerCase().includes(q)
        }
        toolbar={
          <SimpleSelect
            aria-label="Filter by status"
            className="w-48"
            value={status}
            onValueChange={setStatus}
            options={[
              { value: '', label: 'All statuses' },
              ...Object.values(PurchaseOrderStatus).map((s) => ({
                value: s,
                label: s.replace(/_/g, ' '),
              })),
            ]}
          />
        }
        empty={
          <EmptyState
            title={status ? 'No matches' : 'No purchase orders'}
            description={status ? 'No POs in this status.' : 'Raise a purchase order to bring stock in.'}
            action={<Link className={buttonVariants()} href="/purchase-orders/new">New PO</Link>}
          />
        }
      />
    </div>
  );
}
