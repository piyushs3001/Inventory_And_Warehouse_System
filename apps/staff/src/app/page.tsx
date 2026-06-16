'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@iws/auth';

export default function RootPage() {
  const { status, user } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (status === 'unauthenticated') router.replace('/login');
    else if (status === 'authenticated') {
      router.replace(user?.role === 'SUPER_ADMIN' ? '/admin' : '/home');
    }
  }, [status, user, router]);

  return <main className="flex min-h-screen items-center justify-center">Loading…</main>;
}
