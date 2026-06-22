'use client';

import { Switch as SwitchPrimitive } from '@base-ui/react/switch';

import { cn } from '../../utils';

/**
 * Brand-tinted toggle switch: a sliding track + thumb for boolean settings
 * (e.g. an "Active" toggle). The track is muted when off and fills with the
 * primary colour when on; the thumb slides left→right. Pairs with a <Label>
 * via htmlFor / id.
 */
function Switch({ className, ...props }: SwitchPrimitive.Root.Props) {
  return (
    <SwitchPrimitive.Root
      data-slot="switch"
      className={cn(
        'peer inline-flex h-5 w-9 shrink-0 items-center rounded-full border border-transparent bg-input p-0.5 shadow-xs transition-[color,background-color,border-color,box-shadow] outline-none',
        'focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50',
        'data-[checked]:bg-primary',
        'disabled:cursor-not-allowed disabled:opacity-50',
        className,
      )}
      {...props}
    >
      <SwitchPrimitive.Thumb
        data-slot="switch-thumb"
        className={cn(
          'pointer-events-none block size-4 rounded-full bg-background shadow-sm ring-0 transition-transform',
          'data-[unchecked]:translate-x-0 data-[checked]:translate-x-4',
        )}
      />
    </SwitchPrimitive.Root>
  );
}

export { Switch };
