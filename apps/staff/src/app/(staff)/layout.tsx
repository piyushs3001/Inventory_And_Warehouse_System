'use client';

import type { ReactNode } from 'react';
import { useRequireAuth } from '@iws/auth';
import { Role } from '@iws/api-client';
import { AppShell } from '@/components/app-shell/app-shell';

// The Staff app is for Staff and Warehouse Managers. Wrong-role accounts are
// rejected at the login page; this guard is the fallback for direct access.
const STAFF_ROLES: Role[] = [Role.STAFF, Role.WAREHOUSE_MANAGER];

export default function StaffLayout({ children }: { children: ReactNode }) {
  const { user, status } = useRequireAuth({ roles: STAFF_ROLES });
  if (status !== 'authenticated' || !user || !STAFF_ROLES.includes(user.role)) {
    return (
      <main className="flex min-h-screen items-center justify-center text-muted-foreground">Loading…</main>
    );
  }
  return <AppShell surface="staff">{children}</AppShell>;
}
