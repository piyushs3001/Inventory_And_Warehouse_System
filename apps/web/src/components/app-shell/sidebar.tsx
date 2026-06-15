'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import type { Role } from '@/lib/api/generated/model';
import { cn } from '@/lib/utils';
import { NAV, SURFACE_LABEL, type Surface } from './nav-config';
import { UserMenu } from './user-menu';

export function Sidebar({ surface, role }: { surface: Surface; role: Role }) {
  const pathname = usePathname();
  return (
    <aside className="flex w-[248px] shrink-0 flex-col border-r border-border bg-card">
      <div className="flex items-center gap-2.5 px-4 py-4">
        <span className="flex size-8 items-center justify-center rounded-lg bg-primary text-[15px] font-bold text-primary-foreground">
          ▦
        </span>
        <span className="text-[15px] leading-tight font-bold">
          IWS
          <span className="block text-[10.5px] font-medium tracking-wide text-faint">{SURFACE_LABEL[surface]}</span>
        </span>
      </div>
      <nav className="flex-1 overflow-y-auto px-2.5 pb-2">
        {NAV[surface].map((group, gi) => {
          const items = group.items.filter((it) => it.roles.includes(role));
          if (items.length === 0) return null;
          return (
            <div key={group.section ?? `g${gi}`}>
              {group.section ? (
                <div className="px-2.5 pt-4 pb-1 font-mono text-[10.5px] tracking-[0.13em] text-faint uppercase">
                  {group.section}
                </div>
              ) : null}
              {items.map((it) => {
                const Icon = it.icon;
                const active = pathname === it.href || pathname.startsWith(it.href + '/');
                return (
                  <Link
                    key={it.href}
                    href={it.href}
                    aria-current={active ? 'page' : undefined}
                    className={cn(
                      'relative my-px flex items-center gap-2.5 rounded-md px-2.5 py-2 text-[13.5px] font-medium transition-colors',
                      active
                        ? 'bg-primary-tint font-semibold text-primary before:absolute before:top-1/2 before:-left-2.5 before:h-[18px] before:w-[3px] before:-translate-y-1/2 before:rounded-r-sm before:bg-primary before:content-[""]'
                        : 'text-muted-foreground hover:bg-surface-2 hover:text-foreground',
                    )}
                  >
                    <Icon className="size-[17px] shrink-0" aria-hidden />
                    {it.label}
                  </Link>
                );
              })}
            </div>
          );
        })}
      </nav>
      <div className="border-t border-border p-3">
        <UserMenu />
      </div>
    </aside>
  );
}
