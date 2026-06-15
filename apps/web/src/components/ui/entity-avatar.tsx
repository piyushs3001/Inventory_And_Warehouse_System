import { cn, initials } from '@/lib/utils';

export function EntityAvatar({ name, className }: { name: string; className?: string }) {
  return (
    <span
      aria-hidden
      className={cn(
        'flex size-8 shrink-0 items-center justify-center rounded-full bg-primary-tint text-[11px] font-semibold text-primary',
        className,
      )}
    >
      {initials(name)}
    </span>
  );
}
