import type { ComponentProps, ReactNode } from 'react';
import { cn } from '@/lib/utils';

type EmptyStateProps = Omit<ComponentProps<'div'>, 'title'> & {
  icon?: ReactNode;
  title: string;
  description?: string;
  action?: ReactNode;
};

export function EmptyState({ icon, title, description, action, className, ...props }: EmptyStateProps) {
  return (
    <div
      className={cn(
        'flex flex-col items-center justify-center gap-3 rounded-xl border border-dashed border-border px-6 py-12 text-center',
        className,
      )}
      {...props}
    >
      {icon ? (
        <div className="flex size-10 items-center justify-center rounded-lg bg-surface-2 text-muted-foreground">{icon}</div>
      ) : null}
      <div className="space-y-1">
        <p className="text-sm font-medium text-foreground">{title}</p>
        {description ? <p className="text-sm text-muted-foreground">{description}</p> : null}
      </div>
      {action}
    </div>
  );
}
