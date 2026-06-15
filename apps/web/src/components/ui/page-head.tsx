import type { ReactNode } from 'react';
import { cn } from '@/lib/utils';

export function PageHead({
  title, description, actions, className,
}: {
  title: string; description?: ReactNode; actions?: ReactNode; className?: string;
}) {
  return (
    <div className={cn('mb-6 flex items-start gap-4', className)}>
      <div>
        <h1 className="text-2xl font-bold tracking-tight">{title}</h1>
        {description ? <p className="mt-1 text-sm text-muted-foreground">{description}</p> : null}
      </div>
      {actions ? <div className="ml-auto flex gap-2">{actions}</div> : null}
    </div>
  );
}
