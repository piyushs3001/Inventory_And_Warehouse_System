import type { ComponentProps, ReactNode } from 'react';
import { cn } from '@/lib/utils';

type PageHeadProps = Omit<ComponentProps<'div'>, 'title'> & {
  title: ReactNode;
  description?: ReactNode;
  actions?: ReactNode;
};

export function PageHead({ title, description, actions, className, ...props }: PageHeadProps) {
  return (
    <div className={cn('mb-6 flex items-start gap-4', className)} {...props}>
      <div>
        <h1 className="text-2xl font-bold tracking-tight">{title}</h1>
        {description ? <p className="mt-1 text-sm text-muted-foreground">{description}</p> : null}
      </div>
      {actions ? <div className="ml-auto flex gap-2">{actions}</div> : null}
    </div>
  );
}
