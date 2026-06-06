import { describe, it, expect, beforeEach } from 'vitest';
import '@testing-library/jest-dom/vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import MockAdapter from 'axios-mock-adapter';
import { AXIOS_INSTANCE } from '@/lib/api/axios';
import UsersPage from './page';

let mock: MockAdapter;
beforeEach(() => { mock = new MockAdapter(AXIOS_INSTANCE); });

const renderPage = () =>
  render(
    <QueryClientProvider client={new QueryClient()}>
      <UsersPage />
    </QueryClientProvider>,
  );

describe('UsersPage', () => {
  it('renders users from the API', async () => {
    mock.onGet('/users').reply(200, [
      { id: '1', name: 'Super Admin', email: 'admin@iws.local',
        role: 'SUPER_ADMIN', status: 'ACTIVE', createdAt: '', updatedAt: '', warehouses: [] },
    ]);
    renderPage();
    await waitFor(() => expect(screen.getByText('admin@iws.local')).toBeInTheDocument());
  });
});
