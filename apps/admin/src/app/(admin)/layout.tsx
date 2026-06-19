'use client';

import type { ReactNode } from 'react';
import { useRequireAuth } from '@iws/auth';
import { Role } from '@iws/api-client';
import { AppShell } from '@/components/app-shell/app-shell';

// The Admin Portal is for Super Admins and Warehouse Managers. Wrong-role
// accounts are rejected at the login page; this guard is the fallback for
// direct access.
const ADMIN_ROLES: Role[] = [Role.SUPER_ADMIN, Role.WAREHOUSE_MANAGER];

export default function AdminLayout({ children }: { children: ReactNode }) {
  const { user, status } = useRequireAuth({ roles: ADMIN_ROLES });
  if (status !== 'authenticated' || !user || !ADMIN_ROLES.includes(user.role)) {
    return (
      <main className="flex min-h-screen items-center justify-center text-muted-foreground">Loading…</main>
    );
  }
  return <AppShell surface="admin">{children}</AppShell>;
}
