'use client';

import { useRouter } from 'next/navigation';
import { LogOutIcon } from 'lucide-react';
import { useAuth } from '@/lib/auth/auth-context';
import { Button } from '@/components/ui/button';
import { initials, roleLabel } from './nav-config';

export function UserMenu() {
  const { user, logout } = useAuth();
  const router = useRouter();

  const onLogout = async (): Promise<void> => {
    await logout();
    router.replace('/login');
  };

  return (
    <div className="flex items-center gap-2.5 rounded-md px-2 py-1.5">
      <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-primary text-xs font-semibold text-primary-foreground">
        {user ? initials(user.name) : '?'}
      </span>
      <div className="min-w-0 leading-tight">
        <div className="truncate text-xs font-semibold">{user?.name}</div>
        <div className="text-[11px] text-faint">{user ? roleLabel(user.role) : ''}</div>
      </div>
      <Button variant="ghost" size="icon-sm" className="ml-auto" aria-label="Log out" onClick={onLogout}>
        <LogOutIcon />
      </Button>
    </div>
  );
}
