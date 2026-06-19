'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from './auth-context';
import type { Role } from '@iws/api-client';

/**
 * Client-side route guard. UI convenience only — server-side role + scope authz
 * is always enforced by the API.
 *
 * - unauthenticated → this app's `/login`.
 * - authenticated but `roles` doesn't include the user's role → this app's `/login`
 *   (the wrong-app case is handled at the login page with a clear message, so the
 *   guard never silently bounces to the other app's URL).
 */
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
      router.replace('/login');
    }
  }, [status, user, roles, router]);

  return { user, status };
}
