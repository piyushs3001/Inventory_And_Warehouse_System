'use client';

import {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
  type ReactNode,
} from 'react';
import { useQueryClient } from '@tanstack/react-query';
import {
  useAuthControllerMe,
  getAuthControllerMeQueryKey,
  authControllerLogin,
  authControllerLogout,
} from '@iws/api-client';
import type { UserDto } from '@iws/api-client';
import { tokenStore } from '@iws/api-client';

type Status = 'loading' | 'authenticated' | 'unauthenticated';

interface AuthValue {
  user: UserDto | null;
  status: Status;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthValue | null>(null);

/**
 * Reads localStorage once at first render (client only — tokenStore.hydrate
 * is a no-op on the server). The lazy initializer runs synchronously on the
 * client so we don't need a useEffect + setState for the initial hydration,
 * which avoids the react-hooks/set-state-in-effect lint error.
 */
function initHasToken(): boolean {
  tokenStore.hydrate();
  return tokenStore.getAccess() !== null;
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const queryClient = useQueryClient();
  // Lazy initializer runs only on the client (SSR: tokenStore.hydrate is a no-op).
  const [hasToken, setHasToken] = useState<boolean>(initHasToken);

  const meQuery = useAuthControllerMe({
    query: { enabled: hasToken, retry: false },
  });

  const clearAuthState = useCallback((): void => {
    setHasToken(false);
    queryClient.removeQueries({ queryKey: getAuthControllerMeQueryKey() });
  }, [queryClient]);

  useEffect(() => {
    window.addEventListener('iws:logout', clearAuthState);
    return () => window.removeEventListener('iws:logout', clearAuthState);
  }, [clearAuthState]);

  const login = useCallback(async (email: string, password: string): Promise<void> => {
    const tokens = await authControllerLogin({ email, password });
    tokenStore.set(tokens);
    setHasToken(true);
    await queryClient.invalidateQueries({ queryKey: getAuthControllerMeQueryKey() });
  }, [queryClient]);

  const logout = useCallback(async (): Promise<void> => {
    try {
      await authControllerLogout();
    } finally {
      tokenStore.clear();
      setHasToken(false);
      queryClient.clear();
    }
  }, [queryClient]);

  let status: Status;
  if (!hasToken) status = 'unauthenticated';
  else if (meQuery.isLoading) status = 'loading';
  else if (meQuery.isError) status = 'unauthenticated';
  else if (meQuery.data) status = 'authenticated';
  else status = 'loading';

  return (
    <AuthContext.Provider value={{ user: meQuery.data ?? null, status, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within <AuthProvider>');
  return ctx;
}
