'use client';

import { usePathname } from 'next/navigation';
import { ThemeToggle } from './theme-toggle';
import { SURFACE_CRUMB, pageLabel, type Surface } from './nav-config';

export function Topbar({ surface }: { surface: Surface }) {
  const pathname = usePathname();
  return (
    <header className="flex h-[60px] shrink-0 items-center gap-3 border-b border-border bg-card/75 px-6 backdrop-blur-md backdrop-saturate-150">
      <nav aria-label="Breadcrumb" className="flex items-center gap-1.5 text-xs text-faint">
        <span>{SURFACE_CRUMB[surface]}</span>
        <span aria-hidden>/</span>
        <span className="font-semibold text-foreground">{pageLabel(pathname, surface)}</span>
      </nav>
      <div className="ml-auto flex items-center gap-1">
        <ThemeToggle />
      </div>
    </header>
  );
}
