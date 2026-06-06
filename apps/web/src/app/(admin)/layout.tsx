'use client';

import type { ReactNode } from 'react';
import { useRequireAuth } from '@/lib/auth/use-require-auth';
import { Role } from '@/lib/api/generated/model';
import { Nav } from '@/components/app-shell/nav';
import { UserMenu } from '@/components/app-shell/user-menu';

export default function AdminLayout({ children }: { children: ReactNode }) {
  const { user, status } = useRequireAuth({ roles: [Role.SUPER_ADMIN] });
  if (status !== 'authenticated' || !user || user.role !== Role.SUPER_ADMIN) {
    return <main className="flex min-h-screen items-center justify-center">Loading…</main>;
  }
  return (
    <div className="flex min-h-screen">
      <aside className="w-56 border-r p-4">
        <h2 className="mb-4 font-semibold">IWS Admin</h2>
        <Nav role={user.role} />
      </aside>
      <div className="flex flex-1 flex-col">
        <header className="flex items-center justify-end border-b p-4">
          <UserMenu />
        </header>
        <main className="flex-1 p-6">{children}</main>
      </div>
    </div>
  );
}
