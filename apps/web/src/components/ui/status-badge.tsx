import type { ComponentProps } from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/lib/utils';

const statusBadgeVariants = cva(
  'inline-flex items-center gap-1.5 rounded-full border px-2 py-0.5 text-xs font-semibold whitespace-nowrap',
  {
    variants: {
      tone: {
        ok: 'bg-ok-tint text-ok border-ok/20',
        reserved: 'bg-reserved-tint text-reserved border-reserved/20',
        transit: 'bg-transit-tint text-transit border-transit/20',
        warn: 'bg-warn-tint text-warn-ink border-warn/30',
        danger: 'bg-danger-tint text-destructive border-destructive/20',
        muted: 'bg-surface-3 text-muted-foreground border-transparent',
        brand: 'bg-primary-tint text-primary border-primary/20',
      },
    },
    defaultVariants: { tone: 'muted' },
  },
);

export type StatusTone = NonNullable<VariantProps<typeof statusBadgeVariants>['tone']>;

export function StatusBadge({
  tone,
  className,
  children,
  ...props
}: ComponentProps<'span'> & VariantProps<typeof statusBadgeVariants>) {
  return (
    <span className={cn(statusBadgeVariants({ tone }), className)} {...props}>
      <span className="size-1.5 rounded-full bg-current" aria-hidden />
      {children}
    </span>
  );
}
