import { cn } from '@/lib/utils';

function toneFor(value: number): string {
  if (value >= 90) return 'bg-destructive';
  if (value >= 80) return 'bg-warn';
  return 'bg-primary';
}

export function ProgressBar({ value, label }: { value: number; label?: string }) {
  const clamped = Math.max(0, Math.min(100, value));
  return (
    <div className="flex flex-col gap-1">
      {label ? (
        <div className="flex justify-between text-xs">
          <span className="text-muted-foreground">{label}</span>
          <span className="font-mono tabular-nums">{clamped}%</span>
        </div>
      ) : null}
      <div
        role="progressbar"
        aria-valuenow={clamped}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-label={label}
        className="h-2 w-full overflow-hidden rounded-full bg-surface-3"
      >
        <div className={cn('h-full rounded-full transition-all', toneFor(clamped))} style={{ width: `${clamped}%` }} />
      </div>
    </div>
  );
}
