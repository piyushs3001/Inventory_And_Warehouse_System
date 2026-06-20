'use client';

import { Truck, ArrowRightLeft, ClipboardList, Boxes, AlertTriangle, Package } from 'lucide-react';
import { useAuth } from '@iws/auth';
import { useDashboardControllerGet } from '@iws/api-client';
import {
  PageHead, QuickActionCard, KpiCard, StatusBadge, Skeleton, EmptyState,
} from '@iws/ui';

const CARD = 'rounded-[16px] border border-border bg-card p-5 shadow-xs';

export default function HomePage() {
  const { user } = useAuth();
  const firstName = user?.name?.split(' ')[0];
  const { data, isLoading } = useDashboardControllerGet();

  return (
    <div className="flex flex-col gap-5">
      <PageHead
        title={`Good morning${firstName ? `, ${firstName}` : ''}`}
        description="Your warehouses at a glance."
      />

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-3">
        <QuickActionCard icon={<Truck />} tone="transit" label="Receive Stock" description="Log incoming deliveries" href="/receive" />
        <QuickActionCard icon={<ArrowRightLeft />} tone="reserved" label="Stock Transfer" description="Move between warehouses" href="/transfers" />
        <QuickActionCard icon={<ClipboardList />} tone="warn" label="Stock Count" description="Verify physical stock" href="/counting" />
      </div>

      {isLoading || !data ? (
        <div className="grid grid-cols-2 gap-3.5 md:grid-cols-3">
          {Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-28 w-full" />)}
        </div>
      ) : (
        <>
          <div className="grid grid-cols-2 gap-3.5 md:grid-cols-3">
            <KpiCard icon={<Boxes className="size-4" />} label="Stock units" value={data.totalStockUnits} />
            <KpiCard icon={<AlertTriangle className="size-4" />} label="Low stock" value={data.lowStockCount} />
            <KpiCard icon={<ArrowRightLeft className="size-4" />} label="Pending transfers" value={data.pendingTransfers} />
          </div>

          <section className={CARD}>
            <h2 className="mb-3 text-[14.5px] font-semibold">Recent stock activity</h2>
            {data.recentMovements.length === 0 ? (
              <EmptyState title="No movements yet" description="Recent stock changes in your warehouses appear here." />
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
        </>
      )}
    </div>
  );
}
