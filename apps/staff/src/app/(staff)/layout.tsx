'use client';

import type { ReactNode } from 'react';
import { useRequireAuth } from '@iws/auth';
import { Role } from '@iws/api-client';
import { AppShell } from '@/components/app-shell/app-shell';

// The Staff app is for Staff and Warehouse Managers. A Super Admin who lands
// here is bounced to the Admin Portal.
const STAFF_ROLES: Role[] = [Role.STAFF, Role.WAREHOUSE_MANAGER];
const ADMIN_APP_URL = process.env.NEXT_PUBLIC_ADMIN_URL ?? 'http://localhost:5001';

export default function StaffLayout({ children }: { children: ReactNode }) {
  const { user, status } = useRequireAuth({ roles: STAFF_ROLES, deniedRedirect: ADMIN_APP_URL });
  if (status !== 'authenticated' || !user || !STAFF_ROLES.includes(user.role)) {
    return (
      <main className="flex min-h-screen items-center justify-center text-muted-foreground">Loading…</main>
    );
  }
  return <AppShell surface="staff">{children}</AppShell>;
}
