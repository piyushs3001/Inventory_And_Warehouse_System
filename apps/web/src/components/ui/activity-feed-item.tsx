import type { ReactNode } from 'react';
import { cn } from '@/lib/utils';

type Tone = 'ok' | 'warn' | 'transit' | 'reserved' | 'danger' | 'brand';
const toneClass: Record<Tone, string> = {
  ok: 'bg-ok-tint text-ok',
  warn: 'bg-warn-tint text-warn-ink',
  transit: 'bg-transit-tint text-transit',
  reserved: 'bg-reserved-tint text-reserved',
  danger: 'bg-danger-tint text-destructive',
  brand: 'bg-primary-tint text-primary',
};

export function ActivityFeedItem({
  icon, tone = 'brand', actor, action, time,
}: {
  icon: ReactNode; tone?: Tone; actor: string; action: ReactNode; time: string;
}) {
  return (
    <div className="flex items-start gap-3 py-2.5">
      <span className={cn('flex size-8 shrink-0 items-center justify-center rounded-lg [&_svg]:size-4', toneClass[tone])}>
        {icon}
      </span>
      <div className="min-w-0 flex-1 text-[13px]">
        <span className="font-semibold">{actor}</span> <span className="text-muted-foreground">{action}</span>
      </div>
      <span className="shrink-0 font-mono text-[11px] text-faint tabular-nums">{time}</span>
    </div>
  );
}
