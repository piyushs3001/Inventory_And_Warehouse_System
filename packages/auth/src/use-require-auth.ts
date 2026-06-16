'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from './auth-context';
import type { Role } from '@iws/api-client';

/**
 * Client-side route guard. UI convenience only — server-side role + scope authz
 * is always enforced by the API.
 *
 * - `roles` — roles allowed on this surface; a signed-in user whose role is not
 *   listed is sent to `deniedRedirect`.
 * - `deniedRedirect` — where a denied role goes. A full `http(s)://` URL is a real
 *   navigation to the *other* app (different port); a path stays in-app. Default `/login`.
 */
export function useRequireAuth(opts?: { roles?: Role[]; deniedRedirect?: string }) {
  const { user, status } = useAuth();
  const router = useRouter();
  const roles = opts?.roles;
  const deniedRedirect = opts?.deniedRedirect ?? '/login';

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.replace('/login');
      return;
    }
    if (status === 'authenticated' && roles && user && !roles.includes(user.role)) {
      if (/^https?:\/\//.test(deniedRedirect)) {
        if (typeof window !== 'undefined') window.location.assign(deniedRedirect);
      } else {
        router.replace(deniedRedirect);
      }
    }
  }, [status, user, roles, router, deniedRedirect]);

  return { user, status };
}
