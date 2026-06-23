import * as React from 'react';
import { cn } from '../../utils';

export function PageContainer({ className, ...props }: React.ComponentProps<'div'>) {
  return <div className={cn('flex w-full flex-col gap-6', className)} {...props} />;
}
