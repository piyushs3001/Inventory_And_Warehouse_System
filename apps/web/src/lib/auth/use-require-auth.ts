'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from './auth-context';
import type { Role } from '../api/generated/model';

export function useRequireAuth(opts?: { roles?: Role[] }) {
  const { user, status } = useAuth();
  const router = useRouter();
  const roles = opts?.roles;

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.replace('/login');
      return;
    }
    if (status === 'authenticated' && roles && user && !roles.includes(user.role)) {
      router.replace('/home');
    }
  }, [status, user, roles, router]);

  return { user, status };
}
