'use client';

import { Checkbox as CheckboxPrimitive } from '@base-ui/react/checkbox';
import { CheckIcon } from 'lucide-react';

import { cn } from '../../utils';

/**
 * Brand-tinted checkbox: a crisp box that fills with the primary colour and
 * shows a check when on. Pairs with a <Label> via htmlFor / id.
 */
function Checkbox({ className, ...props }: CheckboxPrimitive.Root.Props) {
  return (
    <CheckboxPrimitive.Root
      data-slot="checkbox"
      className={cn(
        'peer flex size-[18px] shrink-0 items-center justify-center rounded-[6px] border border-border-strong bg-transparent text-primary-foreground shadow-xs transition-[color,background-color,border-color,box-shadow] outline-none',
        'hover:border-muted-foreground',
        'focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50',
        'data-[checked]:border-primary data-[checked]:bg-primary',
        'data-[indeterminate]:border-primary data-[indeterminate]:bg-primary',
        'disabled:cursor-not-allowed disabled:opacity-50',
        className,
      )}
      {...props}
    >
      <CheckboxPrimitive.Indicator
        data-slot="checkbox-indicator"
        className="flex items-center justify-center text-current transition-none data-[unchecked]:hidden"
      >
        <CheckIcon className="size-3.5" strokeWidth={3} />
      </CheckboxPrimitive.Indicator>
    </CheckboxPrimitive.Root>
  );
}

export { Checkbox };
