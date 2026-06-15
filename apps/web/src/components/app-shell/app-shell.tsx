'use client';

import type { ReactNode } from 'react';
import { useAuth } from '@/lib/auth/auth-context';
import { Sidebar } from './sidebar';
import { Topbar } from './topbar';
import type { Surface } from './nav-config';

export function AppShell({ surface, children }: { surface: Surface; children: ReactNode }) {
  const { user } = useAuth();
  if (!user) return null; // the layout's useRequireAuth owns the redirect/loading state
  return (
    <div className="flex h-screen overflow-hidden">
      <Sidebar surface={surface} role={user.role} />
      <div className="flex min-w-0 flex-1 flex-col">
        <Topbar surface={surface} />
        <main className="flex-1 overflow-y-auto p-7">{children}</main>
      </div>
    </div>
  );
}
