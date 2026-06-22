import { cn, initials } from '../../utils';

export interface EntityAvatarProps {
  name: string;
  /** Optional image URL. When provided, renders an <img> instead of initials. */
  imageUrl?: string | null;
  className?: string;
}

export function EntityAvatar({ name, imageUrl, className }: EntityAvatarProps) {
  const base = cn(
    'flex size-8 shrink-0 items-center justify-center rounded-full bg-primary-tint text-[11px] font-semibold text-primary overflow-hidden',
    className,
  );

  if (imageUrl) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={imageUrl}
        alt={name}
        className={cn(
          'size-8 shrink-0 rounded-full object-cover',
          className,
        )}
      />
    );
  }

  return (
    <span
      aria-hidden
      className={base}
    >
      {initials(name)}
    </span>
  );
}
