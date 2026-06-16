'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@iws/auth';

export default function RootPage() {
  const { status } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (status === 'unauthenticated') router.replace('/login');
    else if (status === 'authenticated') router.replace('/home');
    // A Super Admin who lands here is bounced to the Admin app by the (staff) layout guard.
  }, [status, router]);

  return <main className="flex min-h-screen items-center justify-center">Loading…</main>;
}
