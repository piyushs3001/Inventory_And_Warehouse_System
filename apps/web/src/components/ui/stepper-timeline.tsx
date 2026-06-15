import { Check } from 'lucide-react';
import { cn } from '@/lib/utils';

export function StepperTimeline({ steps, activeIndex }: { steps: string[]; activeIndex: number }) {
  return (
    <ol className="flex items-center">
      {steps.map((label, i) => {
        const done = i < activeIndex;
        const active = i === activeIndex;
        return (
          <li
            key={label}
            aria-current={active ? 'step' : undefined}
            className="flex flex-1 items-center gap-2 last:flex-none"
          >
            <span
              className={cn(
                'flex size-7 items-center justify-center rounded-full text-xs font-semibold',
                done && 'bg-ok text-primary-foreground',
                active && 'bg-primary text-primary-foreground ring-4 ring-primary-tint',
                !done && !active && 'bg-surface-3 text-muted-foreground',
              )}
            >
              {done ? <Check className="size-4" aria-hidden /> : i + 1}
            </span>
            <span className={cn('text-[13px]', active ? 'font-semibold' : 'text-muted-foreground')}>{label}</span>
            {i < steps.length - 1 ? (
              <span className={cn('mx-2 h-px flex-1', done ? 'bg-ok' : 'bg-border')} aria-hidden />
            ) : null}
          </li>
        );
      })}
    </ol>
  );
}
