'use client';

import { Package, DollarSign, Warehouse, AlertTriangle, ShoppingCart, TrendingUp, Sparkles } from 'lucide-react';
import { useAuth } from '@/lib/auth/auth-context';
import { PageHead } from '@/components/ui/page-head';
import { Button } from '@/components/ui/button';
import { KpiCard } from '@/components/ui/kpi-card';
import { AreaChart } from '@/components/ui/area-chart';
import { BarChart } from '@/components/ui/bar-chart';
import { ProgressBar } from '@/components/ui/progress-bar';
import { ActivityFeedItem } from '@/components/ui/activity-feed-item';
import { dashboardMock as d } from './_dashboard/dashboard.mock';

const KPI_ICONS = [Package, DollarSign, Warehouse, AlertTriangle, ShoppingCart, TrendingUp];

const CARD = 'rounded-[16px] border border-border bg-card p-5 shadow-xs';

export default function DashboardPage() {
  const { user } = useAuth();
  const firstName = user?.name?.split(' ')[0];
  return (
    <div className="flex flex-col gap-5">
      <PageHead
        title={`Good morning${firstName ? `, ${firstName}` : ''}`}
        description="Sample data — live figures arrive with Reports (Phase 6)."
        actions={
          <div className="flex gap-2">
            <Button variant="outline">Export</Button>
            <Button>New Purchase Order</Button>
          </div>
        }
      />

      <div className="grid grid-cols-2 gap-3.5 md:grid-cols-3 xl:grid-cols-6">
        {d.kpis.map((k, i) => {
          const Icon = KPI_ICONS[i] ?? Package;
          return <KpiCard key={k.label} icon={<Icon className="size-4" />} label={k.label} value={k.value} delta={k.delta} />;
        })}
      </div>

      <div className="grid gap-4 lg:grid-cols-[1.55fr_1fr]">
        <section className={CARD}>
          <h2 className="mb-3 text-[14.5px] font-semibold">Inventory Value Trend</h2>
          <AreaChart data={d.valueTrend} label="Inventory Value Trend" />
        </section>
        <section className={CARD}>
          <h2 className="mb-3 text-[14.5px] font-semibold">Warehouse Utilization</h2>
          <div className="flex flex-col gap-2.5">
            {d.utilization.map((w) => <ProgressBar key={w.name} label={w.name} value={w.pct} />)}
          </div>
        </section>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <section className={CARD}>
          <h2 className="mb-3 text-[14.5px] font-semibold">Purchase Orders</h2>
          <BarChart values={d.poWeeks} label="Purchase Orders by week" />
        </section>
        <section className={CARD}>
          <h2 className="mb-3 text-[14.5px] font-semibold">Top Selling Products</h2>
          <div className="flex flex-col gap-2.5">
            {d.topProducts.map((p) => <ProgressBar key={p.name} label={p.name} value={p.pct} />)}
          </div>
        </section>
      </div>

      <div className="grid gap-4 lg:grid-cols-[1.4fr_1fr]">
        <section className={CARD}>
          <h2 className="mb-2 text-[14.5px] font-semibold">Recent Stock Activity</h2>
          <div className="divide-y divide-border">
            {d.activity.map((a) => (
              <ActivityFeedItem key={a.action} icon={<Package />} tone={a.tone} actor={a.actor} action={a.action} time={a.time} />
            ))}
          </div>
        </section>
        <div className="flex flex-col gap-4">
          <section className="rounded-[16px] border border-brand-border bg-gradient-to-br from-ai-1 to-ai-2 p-5 shadow-xs">
            <div className="mb-2 flex items-center gap-2 text-[14.5px] font-semibold text-primary">
              <Sparkles className="size-4" /> AI Recommendations
              <span className="ml-auto rounded-full bg-brand-weak px-2 py-0.5 font-mono text-[10px] font-bold tracking-wide text-primary uppercase">Advisory</span>
            </div>
            <ul className="flex flex-col gap-2 text-[13px] text-muted-foreground">
              {d.recommendations.map((r) => <li key={r}>{r}</li>)}
            </ul>
          </section>
          <section className={CARD}>
            <h2 className="mb-2 text-[14.5px] font-semibold">Upcoming Deliveries</h2>
            <ul className="flex flex-col gap-2 text-[13px]">
              {d.deliveries.map((x) => (
                <li key={x.po} className="flex items-center justify-between">
                  <span><span className="font-mono text-faint">{x.date}</span> · {x.supplier}</span>
                  <span className="rounded-full bg-surface-3 px-2 py-0.5 font-mono text-[11px]">{x.po}</span>
                </li>
              ))}
            </ul>
          </section>
        </div>
      </div>
    </div>
  );
}
