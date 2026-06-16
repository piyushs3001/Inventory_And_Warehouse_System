import type { ReactNode } from 'react';
import Link from 'next/link';
import { cn } from '@/lib/utils';

type Tone = 'transit' | 'brand' | 'reserved' | 'warn';
const toneClass: Record<Tone, string> = {
  transit: 'bg-transit-tint text-transit',
  brand: 'bg-primary-tint text-primary',
  reserved: 'bg-reserved-tint text-reserved',
  warn: 'bg-warn-tint text-warn-ink',
};

export function QuickActionCard({
  icon, tone = 'brand', label, description, href,
}: {
  icon: ReactNode; tone?: Tone; label: string; description: string; href: string;
}) {
  return (
    <Link
      href={href}
      className="flex flex-col gap-3 rounded-[16px] border border-border bg-card p-5 shadow-xs transition-all hover:-translate-y-0.5 hover:shadow-md"
    >
      <span className={cn('flex size-11 items-center justify-center rounded-xl [&_svg]:size-6', toneClass[tone])}>
        {icon}
      </span>
      <span className="text-[15px] font-semibold">{label}</span>
      <span className="text-[13px] text-muted-foreground">{description}</span>
    </Link>
  );
}
