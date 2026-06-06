'use client';

import { useAuth } from '@/lib/auth/auth-context';

export default function HomePage() {
  const { user } = useAuth();
  return (
    <div>
      <h1 className="text-2xl font-semibold">Welcome, {user?.name}</h1>
      <p className="text-muted-foreground">
        Your dashboard widgets arrive in Phase 6. For now, this confirms you are signed in.
      </p>
    </div>
  );
}
