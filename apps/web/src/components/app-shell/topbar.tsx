'use client';

import { Search, Sparkles, Bell } from 'lucide-react';
import { ThemeToggle } from './theme-toggle';
import { WarehouseSwitcher } from './warehouse-switcher';
import type { Surface } from './nav-config';

export function Topbar({ surface }: { surface: Surface }) {
  const isAdmin = surface === 'admin';
  return (
    <header className="flex h-[62px] shrink-0 items-center gap-3.5 border-b border-border bg-card/75 px-6 backdrop-blur-md backdrop-saturate-150">
      <div className="relative max-w-[420px] flex-1">
        <Search className="absolute top-1/2 left-3 size-4 -translate-y-1/2 text-faint" aria-hidden />
        <input
          type="search"
          placeholder="Search…"
          aria-label="Search"
          className="h-[38px] w-full rounded-[10px] border border-border bg-surface-2 pr-12 pl-9 text-sm outline-none focus-visible:border-primary focus-visible:ring-3 focus-visible:ring-ring/50"
        />
        <kbd className="absolute top-1/2 right-3 -translate-y-1/2 rounded border border-border bg-card px-1.5 font-mono text-[10px] text-faint">
          ⌘K
        </kbd>
      </div>
      <div className="ml-auto flex items-center gap-3.5">
        {isAdmin ? (
          <button
            type="button"
            className="flex h-[38px] items-center gap-1.5 rounded-[10px] border border-brand-border bg-brand-weak px-3.5 text-[13px] font-semibold text-primary"
            aria-label="Ask AI"
            title="AI assistant — arriving in Phase 7"
          >
            <Sparkles className="size-4" aria-hidden /> Ask AI
          </button>
        ) : null}
        <ThemeToggle />
        <button
          type="button"
          aria-label="Notifications"
          className="relative flex size-[38px] items-center justify-center rounded-[10px] border border-border bg-surface-2"
        >
          <Bell className="size-4" aria-hidden />
          <span className="absolute top-2 right-2 size-[7px] rounded-full bg-destructive" aria-hidden />
          <span className="sr-only">Unread notifications</span>
        </button>
        {isAdmin ? (
          <>
            <span className="h-[26px] w-px bg-border" aria-hidden />
            <WarehouseSwitcher />
          </>
        ) : null}
      </div>
    </header>
  );
}
