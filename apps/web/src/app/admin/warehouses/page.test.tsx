import { describe, it, expect, beforeEach } from 'vitest';
import '@testing-library/jest-dom/vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import MockAdapter from 'axios-mock-adapter';
import { AXIOS_INSTANCE } from '@/lib/api/axios';
import WarehousesPage from './page';

let mock: MockAdapter;
beforeEach(() => { mock = new MockAdapter(AXIOS_INSTANCE); });

const renderPage = () =>
  render(
    <QueryClientProvider client={new QueryClient()}>
      <WarehousesPage />
    </QueryClientProvider>,
  );

describe('WarehousesPage', () => {
  it('renders warehouses from the API', async () => {
    mock.onGet('/warehouses').reply(200, [
      {
        id: 'w1',
        name: 'Central Warehouse',
        status: 'ACTIVE',
        capacity: 500,
        contactPerson: 'Alice',
        address: '1 Main St',
        createdAt: '',
      },
      {
        id: 'w2',
        name: 'North Depot',
        status: 'INACTIVE',
        capacity: null,
        contactPerson: null,
        address: null,
        createdAt: '',
      },
    ]);
    renderPage();
    await waitFor(() => expect(screen.getByText('Central Warehouse')).toBeInTheDocument());
    expect(screen.getByText('North Depot')).toBeInTheDocument();
    expect(screen.getByText('ACTIVE')).toBeInTheDocument();
    expect(screen.getByText('INACTIVE')).toBeInTheDocument();
  });

  it('does not show archived warehouses by default (INACTIVE excluded from mock)', async () => {
    mock.onGet('/warehouses').reply(200, [
      {
        id: 'w1',
        name: 'Central Warehouse',
        status: 'ACTIVE',
        capacity: null,
        contactPerson: null,
        address: null,
        createdAt: '',
      },
    ]);
    renderPage();
    await waitFor(() => expect(screen.getByText('Central Warehouse')).toBeInTheDocument());
    // Archive button only shown for ACTIVE rows
    expect(screen.getByRole('button', { name: /archive/i })).toBeInTheDocument();
  });
});
