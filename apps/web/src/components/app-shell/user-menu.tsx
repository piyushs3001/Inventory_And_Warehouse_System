'use client';

import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth/auth-context';
import { Button } from '@/components/ui/button';

export function UserMenu() {
  const { user, logout } = useAuth();
  const router = useRouter();

  const onLogout = async (): Promise<void> => {
    await logout();
    router.replace('/login');
  };

  return (
    <div className="flex items-center gap-3">
      <span className="text-sm text-muted-foreground">{user?.name}</span>
      <Button variant="outline" size="sm" onClick={onLogout}>
        Log out
      </Button>
    </div>
  );
}
