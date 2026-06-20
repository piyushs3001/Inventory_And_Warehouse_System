'use client';

import {
  Package, DollarSign, Boxes, AlertTriangle, ShoppingCart, ArrowRightLeft,
} from 'lucide-react';
import { useAuth } from '@iws/auth';
import { useDashboardControllerGet } from '@iws/api-client';
import {
  PageHead, KpiCard, StatusBadge, Skeleton, EmptyState,
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@iws/ui';

const CARD = 'rounded-[16px] bg-card p-5 ring-1 ring-foreground/10';

export default function DashboardPage() {
  const { user } = useAuth();
  const firstName = user?.name?.split(' ')[0];
  const { data, isLoading } = useDashboardControllerGet();

  return (
    <div className="flex flex-col gap-5">
      <PageHead
        title={`Good morning${firstName ? `, ${firstName}` : ''}`}
        description="Live figures across all warehouses in your scope."
      />

      {isLoading || !data ? (
        <div className="grid grid-cols-2 gap-3.5 md:grid-cols-3 xl:grid-cols-6">
          {Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-28 w-full" />)}
        </div>
      ) : (
        <>
          <div className="grid grid-cols-2 gap-3.5 md:grid-cols-3 xl:grid-cols-6">
            <KpiCard icon={<Package className="size-4" />} label="Products" value={data.totalProducts} />
            <KpiCard icon={<DollarSign className="size-4" />} label="Stock value" value={`$${data.stockValue}`} />
            <KpiCard icon={<Boxes className="size-4" />} label="Stock units" value={data.totalStockUnits} />
            <KpiCard icon={<AlertTriangle className="size-4" />} label="Low stock" value={data.lowStockCount} />
            <KpiCard icon={<ShoppingCart className="size-4" />} label="Pending POs" value={data.pendingPurchaseOrders} />
            <KpiCard icon={<ArrowRightLeft className="size-4" />} label="Pending transfers" value={data.pendingTransfers} />
          </div>

          <div className="grid gap-4 lg:grid-cols-[1.4fr_1fr]">
            <section className={CARD}>
              <h2 className="mb-3 text-[14.5px] font-semibold">Recent stock activity</h2>
              {data.recentMovements.length === 0 ? (
                <EmptyState title="No movements yet" description="Stock changes will appear here." />
              ) : (
                <div className="divide-y divide-border">
                  {data.recentMovements.map((m) => (
                    <div key={m.id} className="flex items-center gap-3 py-2.5 text-[13px]">
                      <StatusBadge tone="brand">{m.type}</StatusBadge>
                      <div className="min-w-0 flex-1">
                        <span className="font-semibold">{m.productName}</span>{' '}
                        <span className="font-mono text-xs text-muted-foreground">{m.sku}</span>
                        <div className="text-xs text-muted-foreground">{m.warehouseName} · now {m.afterQty}</div>
                      </div>
                      <span className="shrink-0 font-mono text-[11px] text-faint tabular-nums">
                        {new Date(m.createdAt).toLocaleString()}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </section>

            <section className={CARD}>
              <h2 className="mb-3 text-[14.5px] font-semibold">Top products by value</h2>
              {data.topProducts.length === 0 ? (
                <EmptyState title="No stock" description="Top products appear once stock is recorded." />
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Product</TableHead>
                      <TableHead className="text-right">Units</TableHead>
                      <TableHead className="text-right">Value</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {data.topProducts.map((p) => (
                      <TableRow key={p.productId}>
                        <TableCell>
                          <div className="text-[13px] font-semibold">{p.name}</div>
                          <div className="font-mono text-xs text-muted-foreground">{p.sku}</div>
                        </TableCell>
                        <TableCell className="text-right tabular-nums">{p.units}</TableCell>
                        <TableCell className="text-right font-mono tabular-nums">${p.value}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </section>
          </div>
        </>
      )}
    </div>
  );
}
