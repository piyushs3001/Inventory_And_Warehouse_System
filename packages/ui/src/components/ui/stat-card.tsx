import type { ComponentProps, ReactNode } from 'react';
import { cn } from '../../utils';

type Tone = 'brand' | 'ok' | 'warn' | 'reserved' | 'transit';

const iconTone: Record<Tone, string> = {
  brand: 'bg-primary-tint text-primary',
  ok: 'bg-ok-tint text-ok',
  warn: 'bg-warn-tint text-warn-ink',
  reserved: 'bg-reserved-tint text-reserved',
  transit: 'bg-transit-tint text-transit',
};

type StatCardProps = ComponentProps<'div'> & {
  icon?: ReactNode;
  label: string;
  value: ReactNode;
  tone?: Tone;
  trend?: ReactNode;
};

export function StatCard({
  icon,
  label,
  value,
  tone = 'brand',
  trend,
  className,
  ...props
}: StatCardProps) {
  return (
    <div
      className={cn(
        'flex flex-col gap-3 rounded-xl bg-card p-5 text-card-foreground ring-1 ring-foreground/10 transition-shadow hover:shadow-md',
        className,
      )}
      {...props}
    >
      {icon ? (
        <div className={cn('flex size-9 items-center justify-center rounded-lg', iconTone[tone])}>
          {icon}
        </div>
      ) : null}
      <div className="text-sm font-medium text-muted-foreground">{label}</div>
      <div className="font-mono text-2xl font-semibold tracking-tight tabular-nums">{value}</div>
      {trend ? <div className="text-xs font-semibold">{trend}</div> : null}
    </div>
  );
}
