import * as React from 'react';
import { cn } from '../../utils';

type SectionProps = React.ComponentProps<'section'> & {
  title?: React.ReactNode;
  actions?: React.ReactNode;
};

export function Section({ title, actions, className, children, ...props }: SectionProps) {
  return (
    <section
      className={cn('rounded-xl bg-card p-6 ring-1 ring-foreground/10', className)}
      {...props}
    >
      {(title || actions) && (
        <div className="mb-4 flex items-center gap-4">
          {title && <h3 className="text-sm font-semibold">{title}</h3>}
          {actions && <div className="ml-auto flex gap-2">{actions}</div>}
        </div>
      )}
      {children}
    </section>
  );
}
