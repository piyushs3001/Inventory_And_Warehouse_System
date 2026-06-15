import type { ReactNode } from 'react';
import { TriangleAlertIcon } from 'lucide-react';
import { cn } from '@/lib/utils';

export function ErrorState({
  title = 'Something went wrong', description, action, className,
}: {
  title?: string; description?: ReactNode; action?: ReactNode; className?: string;
}) {
  return (
    <div
      className={cn(
        'flex flex-col items-center justify-center gap-3 rounded-xl border border-destructive/20 bg-danger-tint px-6 py-10 text-center',
        className,
      )}
    >
      <TriangleAlertIcon className="size-5 text-destructive" aria-hidden />
      <div className="space-y-1">
        <p className="text-sm font-medium text-destructive">{title}</p>
        {description ? <p className="text-sm text-muted-foreground">{description}</p> : null}
      </div>
      {action}
    </div>
  );
}
