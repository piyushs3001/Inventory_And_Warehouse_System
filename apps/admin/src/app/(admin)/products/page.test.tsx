import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import '@testing-library/jest-dom/vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import MockAdapter from 'axios-mock-adapter';
import { AXIOS_INSTANCE } from '@iws/api-client';
import ProductsPage from './page';

let mock: MockAdapter;
beforeEach(() => { mock = new MockAdapter(AXIOS_INSTANCE); });
afterEach(() => { vi.restoreAllMocks(); });

const CATEGORY = { id: 'cat1', name: 'Beverages', parentId: null, createdAt: '' };
const ACTIVE = {
  id: 'p1', name: 'Cola', sku: 'COLA-1', description: null, categoryId: 'cat1',
  unit: 'can', costPrice: '0.45', sellingPrice: '1.20', reorderLevel: 50,
  status: 'ACTIVE', createdAt: '',
};
const ARCHIVED = {
  id: 'p2', name: 'Old Soda', sku: 'OLD-1', description: null, categoryId: null,
  unit: null, costPrice: '0.00', sellingPrice: '0.00', reorderLevel: 0,
  status: 'ARCHIVED', createdAt: '',
};

const renderPage = () =>
  render(
    <QueryClientProvider client={new QueryClient()}>
      <ProductsPage />
    </QueryClientProvider>,
  );

describe('ProductsPage', () => {
  it('renders products with resolved category name and decimal prices', async () => {
    mock.onGet('/products').reply(200, [ACTIVE]);
    mock.onGet('/categories').reply(200, [CATEGORY]);
    renderPage();
    await waitFor(() => expect(screen.getByText('Cola')).toBeInTheDocument());
    expect(screen.getByText('COLA-1')).toBeInTheDocument();
    // Resolved category name shown in the table cell (also appears in the
    // filter dropdown, so scope to the cell role).
    expect(screen.getByRole('cell', { name: 'Beverages' })).toBeInTheDocument();
    expect(screen.getByText('0.45')).toBeInTheDocument();
    expect(screen.getByText('1.20')).toBeInTheDocument();
  });

  it('shows Archive only for ACTIVE products, not ARCHIVED ones', async () => {
    mock.onGet('/products').reply(200, [ACTIVE, ARCHIVED]);
    mock.onGet('/categories').reply(200, [CATEGORY]);
    renderPage();
    await waitFor(() => expect(screen.getByText('Cola')).toBeInTheDocument());
    await waitFor(() => expect(screen.getByText('Old Soda')).toBeInTheDocument());
    // Only the one ACTIVE row gets an Archive button.
    expect(screen.getAllByRole('button', { name: /archive/i })).toHaveLength(1);
    expect(screen.getByText('ARCHIVED')).toBeInTheDocument();
  });
});
