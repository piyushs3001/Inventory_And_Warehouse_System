import type { ReactNode } from 'react';
import { cn } from '../../utils';

export type DeltaDir = 'up' | 'down' | 'flat';
export interface Delta { dir: DeltaDir; text: string }

const deltaTone: Record<DeltaDir, string> = {
  up: 'text-ok',
  down: 'text-destructive',
  flat: 'text-muted-foreground',
};

export function KpiCard({
  icon, label, value, delta, className,
}: {
  icon?: ReactNode;
  label: string;
  value: ReactNode;
  delta?: Delta;
  className?: string;
}) {
  return (
    <div className={cn('flex flex-col gap-2 rounded-[16px] border border-border bg-card p-4 shadow-xs', className)}>
      {icon ? <div className="flex size-9 items-center justify-center rounded-lg bg-primary-tint text-primary">{icon}</div> : null}
      <div className="text-[13px] font-medium text-muted-foreground">{label}</div>
      <div className="font-mono text-2xl font-bold tracking-tight tabular-nums">{value}</div>
      {delta ? <div className={cn('text-xs font-semibold', deltaTone[delta.dir])}>{delta.text}</div> : null}
    </div>
  );
}
