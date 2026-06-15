import { describe, it, expect, beforeEach } from 'vitest';
import '@testing-library/jest-dom/vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { useState, useEffect } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import MockAdapter from 'axios-mock-adapter';
import { AXIOS_INSTANCE } from '../api/axios';
import { AuthProvider, useAuth } from './auth-context';
import { tokenStore } from './token-store';

function Probe() {
  const { status, user } = useAuth();
  return <div>{status}:{user?.email ?? 'none'}</div>;
}

const wrap = () =>
  render(
    <QueryClientProvider client={new QueryClient()}>
      <AuthProvider>
        <Probe />
      </AuthProvider>
    </QueryClientProvider>,
  );

let mock: MockAdapter;
beforeEach(() => {
  mock = new MockAdapter(AXIOS_INSTANCE);
  localStorage.clear();
  tokenStore.clear();
});

describe('AuthProvider', () => {
  it('is unauthenticated with no token', async () => {
    wrap();
    await waitFor(() => expect(screen.getByText(/unauthenticated:none/)).toBeInTheDocument());
  });

  it('loads the current user when a token exists', async () => {
    tokenStore.set({ accessToken: 'a', refreshToken: 'r' });
    mock.onGet('/auth/me').reply(200, {
      id: '1', name: 'Super Admin', email: 'admin@iws.local',
      role: 'SUPER_ADMIN', status: 'ACTIVE', createdAt: '', updatedAt: '', warehouses: [],
    });
    wrap();
    await waitFor(() =>
      expect(screen.getByText(/authenticated:admin@iws.local/)).toBeInTheDocument(),
    );
  });

  it('surfaces the API error message on a failed login', async () => {
    mock.onPost('/auth/login').reply(401, {
      statusCode: 401,
      error: 'Unauthorized',
      message: 'Invalid email or password',
      timestamp: '2026-06-15T10:00:00.000Z',
      path: '/auth/login',
    });

    // Component that attempts login on mount and surfaces the caught error message.
    function LoginAttempt() {
      const { login } = useAuth();
      const [errorMsg, setErrorMsg] = useState<string>('pending');
      useEffect(() => {
        login('bad@example.com', 'wrongpassword').catch((e: Error) => {
          setErrorMsg(e.message);
        });
      // eslint-disable-next-line react-hooks/exhaustive-deps
      }, []);
      return <div data-testid="error-msg">{errorMsg}</div>;
    }

    render(
      <QueryClientProvider client={new QueryClient()}>
        <AuthProvider>
          <LoginAttempt />
        </AuthProvider>
      </QueryClientProvider>,
    );

    await waitFor(() =>
      expect(screen.getByTestId('error-msg')).not.toHaveTextContent('pending'),
    );
    expect(screen.getByTestId('error-msg')).toHaveTextContent('Invalid email or password');
  });
});
