import { describe, it, expect, beforeEach, vi } from 'vitest';
import '@testing-library/jest-dom/vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import MockAdapter from 'axios-mock-adapter';
import { AXIOS_INSTANCE } from '@iws/api-client';
import { AuthProvider, useAuth } from './auth-context';
import { tokenStore } from '@iws/api-client';

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

  it('rejects with the AxiosError (response intact) on a failed login', async () => {
    mock.onPost('/auth/login').reply(401, {
      statusCode: 401,
      error: 'Unauthorized',
      message: 'Invalid email or password',
      timestamp: '2026-06-15T10:00:00.000Z',
      path: '/auth/login',
    });

    // Spy captures the rejection from login() via an onError callback prop.
    const onError = vi.fn();

    function LoginAttemptOnMount() {
      const { login } = useAuth();
      return (
        <button
          onClick={() => {
            login('bad@example.com', 'wrongpassword').catch(onError);
          }}
        >
          attempt
        </button>
      );
    }

    const { getByRole } = render(
      <QueryClientProvider client={new QueryClient()}>
        <AuthProvider>
          <LoginAttemptOnMount />
        </AuthProvider>
      </QueryClientProvider>,
    );

    getByRole('button', { name: 'attempt' }).click();

    await waitFor(() => expect(onError).toHaveBeenCalled());
    expect(onError.mock.calls[0][0]).toMatchObject({ response: { status: 401 } });
  });
});
