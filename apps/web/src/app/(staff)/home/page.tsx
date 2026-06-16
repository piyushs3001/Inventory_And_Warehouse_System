'use client';

import { Truck, ShoppingCart, ArrowRightLeft, ClipboardList, ChevronRight } from 'lucide-react';
import Link from 'next/link';
import { useAuth } from '@iws/auth';
import { PageHead } from '@iws/ui';
import { QuickActionCard } from '@iws/ui';
import { StatusBadge } from '@iws/ui';
import { homeMock as h } from './home.mock';

export default function HomePage() {
  const { user } = useAuth();
  const firstName = user?.name?.split(' ')[0];
  return (
    <div className="flex flex-col gap-5">
      <PageHead
        title={`Good morning${firstName ? `, ${firstName}` : ''}`}
        description={`${h.warehouse} · your tasks for today`}
      />

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <QuickActionCard icon={<Truck />} tone="transit" label="Receive Stock" description="Log incoming deliveries" href="/receive" />
        <QuickActionCard icon={<ShoppingCart />} tone="brand" label="Dispatch Stock" description="Pick and ship orders" href="/dispatch" />
        <QuickActionCard icon={<ArrowRightLeft />} tone="reserved" label="Stock Transfer" description="Move between warehouses" href="/transfers" />
        <QuickActionCard icon={<ClipboardList />} tone="warn" label="Stock Count" description="Verify physical stock" href="/counting" />
      </div>

      <div className="grid gap-4 lg:grid-cols-[1.5fr_1fr]">
        <section className="rounded-[16px] border border-border bg-card p-5 shadow-xs">
          <h2 className="mb-3 text-[14.5px] font-semibold">My Tasks Today</h2>
          <div className="divide-y divide-border">
            {h.tasks.map((t) => (
              <Link key={t.title} href={t.href} className="flex items-center gap-3 py-3 hover:bg-surface-2">
                <div className="min-w-0 flex-1">
                  <div className="text-[13.5px] font-semibold">{t.title}</div>
                  <div className="text-xs text-muted-foreground">{t.sub}</div>
                </div>
                <StatusBadge tone={t.tone}>{t.badge}</StatusBadge>
                <ChevronRight className="size-4 text-faint" aria-hidden />
              </Link>
            ))}
          </div>
        </section>
        <section className="rounded-[16px] border border-border bg-card p-5 shadow-xs">
          <h2 className="mb-3 text-[14.5px] font-semibold">Pending Notifications</h2>
          <ul className="flex flex-col gap-2 text-[13px] text-muted-foreground">
            {h.notifications.map((n) => <li key={n}>{n}</li>)}
          </ul>
        </section>
      </div>
    </div>
  );
}
