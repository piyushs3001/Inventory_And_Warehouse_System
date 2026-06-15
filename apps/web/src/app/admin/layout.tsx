'use client';

import type { ReactNode } from 'react';
import { useRequireAuth } from '@/lib/auth/use-require-auth';
import { Role } from '@/lib/api/generated/model';
import { AppShell } from '@/components/app-shell/app-shell';

export default function AdminLayout({ children }: { children: ReactNode }) {
  const { user, status } = useRequireAuth({ roles: [Role.SUPER_ADMIN] });
  if (status !== 'authenticated' || !user || user.role !== Role.SUPER_ADMIN) {
    return (
      <main className="flex min-h-screen items-center justify-center text-muted-foreground">Loading…</main>
    );
  }
  return <AppShell surface="admin">{children}</AppShell>;
}
