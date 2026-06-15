'use client';

import type { ReactNode } from 'react';
import { useRequireAuth } from '@/lib/auth/use-require-auth';
import { AppShell } from '@/components/app-shell/app-shell';

export default function StaffLayout({ children }: { children: ReactNode }) {
  const { user, status } = useRequireAuth();
  if (status !== 'authenticated' || !user) {
    return (
      <main className="flex min-h-screen items-center justify-center text-muted-foreground">Loading…</main>
    );
  }
  return <AppShell surface="staff">{children}</AppShell>;
}
