'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import type { Role } from '@iws/api-client';
import { cn } from '@iws/ui';
import { NAV, SURFACE_LABEL, type Surface } from './nav-config';
import { UserMenu } from './user-menu';

export function Sidebar({ surface, role }: { surface: Surface; role: Role }) {
  const pathname = usePathname();
  return (
    <aside className="flex w-[248px] shrink-0 flex-col border-r border-border bg-card">
      <div className="flex items-center gap-2.5 px-4 py-4">
        <span className="flex size-[34px] items-center justify-center rounded-[9px] bg-gradient-to-br from-primary to-primary-2 text-[15px] font-bold text-primary-foreground shadow-[0_4px_12px_var(--brand-glow)]">
          ▦
        </span>
        <span className="text-[15px] leading-tight font-bold tracking-[-0.2px]">
          IWS
          <span className="block text-[11px] font-medium text-faint">{SURFACE_LABEL[surface]}</span>
        </span>
      </div>
      <nav className="flex-1 overflow-y-auto px-2.5 pb-2">
        {NAV[surface].map((group, gi) => {
          const items = group.items.filter((it) => it.roles.includes(role));
          if (items.length === 0) return null;
          return (
            <div key={group.section ?? `g${gi}`}>
              {group.section ? (
                <div className="px-[10px] pt-3.5 pb-[5px] font-mono text-[10.5px] font-bold tracking-[0.7px] text-faint uppercase">
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
                      'my-[1.5px] flex items-center gap-[11px] rounded-[9px] px-[11px] py-[9px] text-[13.5px] transition-all',
                      active
                        ? 'bg-gradient-to-r from-primary to-primary-2 font-semibold text-primary-foreground shadow-[0_4px_12px_var(--brand-glow)]'
                        : 'font-medium text-muted-foreground hover:bg-surface-2 hover:text-foreground',
                    )}
                  >
                    <Icon className="size-[18px] shrink-0" strokeWidth={active ? 2.2 : 2} aria-hidden />
                    <span className="flex-1">{it.label}</span>
                    {it.badge ? (
                      <span
                        className={cn(
                          'rounded-full px-[7px] py-px font-mono text-[10.5px] font-bold tabular-nums',
                          active ? 'bg-white/25 text-primary-foreground' : 'bg-brand-weak text-primary',
                        )}
                      >
                        {it.badge}
                      </span>
                    ) : null}
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
