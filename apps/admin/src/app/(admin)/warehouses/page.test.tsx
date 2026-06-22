import { describe, it, expect, beforeEach } from 'vitest';
import '@testing-library/jest-dom/vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import MockAdapter from 'axios-mock-adapter';
import { AXIOS_INSTANCE } from '@iws/api-client';
import { ConfirmProvider } from '@iws/ui';
import WarehousesPage from './page';

let mock: MockAdapter;
beforeEach(() => { mock = new MockAdapter(AXIOS_INSTANCE); });

const ACTIVE_WAREHOUSE = {
  id: 'w1',
  name: 'Central Warehouse',
  status: 'ACTIVE',
  capacity: 500,
  contactPerson: 'Alice',
  address: '1 Main St',
  createdAt: '',
};

const INACTIVE_WAREHOUSE = {
  id: 'w2',
  name: 'North Depot',
  status: 'INACTIVE',
  capacity: null,
  contactPerson: null,
  address: null,
  createdAt: '',
};

const renderPage = () =>
  render(
    <ConfirmProvider>
      <QueryClientProvider client={new QueryClient()}>
        <WarehousesPage />
      </QueryClientProvider>
    </ConfirmProvider>,
  );

describe('WarehousesPage', () => {
  it('renders warehouses from the API', async () => {
    mock.onGet('/warehouses').reply(200, [ACTIVE_WAREHOUSE, INACTIVE_WAREHOUSE]);
    mock.onGet('/users').reply(200, []);
    renderPage();
    await waitFor(() => expect(screen.getByText('Central Warehouse')).toBeInTheDocument());
    expect(screen.getByText('North Depot')).toBeInTheDocument();
    expect(screen.getByText('ACTIVE')).toBeInTheDocument();
    expect(screen.getByText('INACTIVE')).toBeInTheDocument();
  });

  it('shows Archive action only for ACTIVE rows, not for INACTIVE rows', async () => {
    mock.onGet('/warehouses').reply(200, [ACTIVE_WAREHOUSE, INACTIVE_WAREHOUSE]);
    mock.onGet('/users').reply(200, []);
    renderPage();

    await waitFor(() => expect(screen.getByText('Central Warehouse')).toBeInTheDocument());
    await waitFor(() => expect(screen.getByText('North Depot')).toBeInTheDocument());

    // Exactly one Archive button — only the ACTIVE row gets it
    const archiveButtons = screen.getAllByRole('button', { name: /archive/i });
    expect(archiveButtons).toHaveLength(1);

    // The INACTIVE row shows its status badge
    expect(screen.getByText('INACTIVE')).toBeInTheDocument();
  });
});
