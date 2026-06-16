'use client';

import type { ReactNode } from 'react';
import { useRequireAuth } from '@iws/auth';
import { Role } from '@iws/api-client';
import { AppShell } from '@/components/app-shell/app-shell';

// The Admin Portal is for Super Admins and Warehouse Managers. Anyone else
// (e.g. a Staff sign-in that landed here) is bounced to the Staff app.
const ADMIN_ROLES: Role[] = [Role.SUPER_ADMIN, Role.WAREHOUSE_MANAGER];
const STAFF_APP_URL = process.env.NEXT_PUBLIC_STAFF_URL ?? 'http://localhost:5000';

export default function AdminLayout({ children }: { children: ReactNode }) {
  const { user, status } = useRequireAuth({ roles: ADMIN_ROLES, deniedRedirect: STAFF_APP_URL });
  if (status !== 'authenticated' || !user || !ADMIN_ROLES.includes(user.role)) {
    return (
      <main className="flex min-h-screen items-center justify-center text-muted-foreground">Loading…</main>
    );
  }
  return <AppShell surface="admin">{children}</AppShell>;
}
