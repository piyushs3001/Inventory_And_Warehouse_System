import { describe, it, expect, beforeEach } from 'vitest';
import '@testing-library/jest-dom/vitest';
import { render, screen, waitFor } from '@testing-library/react';
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
});
