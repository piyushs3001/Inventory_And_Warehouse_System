import { describe, it, expect, beforeEach } from 'vitest';
import '@testing-library/jest-dom/vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
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

  it('shows a Pending badge + Approve action for a self-registered user and activates on click', async () => {
    mock.onGet('/users').reply(200, [
      { id: 'p1', name: 'Rosa Martins', email: 'rosa@company.com',
        role: 'STAFF', status: 'PENDING_APPROVAL', createdAt: '', updatedAt: '', warehouses: [] },
    ]);
    mock.onPost('/users/p1/activate').reply(200, {
      id: 'p1', name: 'Rosa Martins', email: 'rosa@company.com',
      role: 'STAFF', status: 'ACTIVE', createdAt: '', updatedAt: '', warehouses: [],
    });

    renderPage();
    await waitFor(() => expect(screen.getByText('rosa@company.com')).toBeInTheDocument());
    expect(screen.getByText('Pending')).toBeInTheDocument();

    await userEvent.click(screen.getByRole('button', { name: 'Approve' }));
    await waitFor(() =>
      expect(mock.history.post.some((r) => r.url === '/users/p1/activate')).toBe(true),
    );
  });
});
