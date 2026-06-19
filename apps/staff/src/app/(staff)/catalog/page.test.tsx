import { describe, it, expect, beforeEach } from 'vitest';
import '@testing-library/jest-dom/vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import MockAdapter from 'axios-mock-adapter';
import { AXIOS_INSTANCE } from '@iws/api-client';
import CatalogPage from './page';

let mock: MockAdapter;
beforeEach(() => { mock = new MockAdapter(AXIOS_INSTANCE); });

const CATEGORY = { id: 'cat1', name: 'Beverages', parentId: null, createdAt: '' };
const PRODUCT = {
  id: 'p1', name: 'Cola', sku: 'COLA-1', description: null, categoryId: 'cat1',
  unit: 'can', costPrice: '0.45', sellingPrice: '1.20', reorderLevel: 50,
  status: 'ACTIVE', createdAt: '',
};

const renderPage = () =>
  render(
    <QueryClientProvider client={new QueryClient()}>
      <CatalogPage />
    </QueryClientProvider>,
  );

describe('CatalogPage (staff, read-only)', () => {
  it('renders the catalog with selling price and category', async () => {
    mock.onGet('/products').reply(200, [PRODUCT]);
    mock.onGet('/categories').reply(200, [CATEGORY]);
    renderPage();
    await waitFor(() => expect(screen.getByText('Cola')).toBeInTheDocument());
    expect(screen.getByText('COLA-1')).toBeInTheDocument();
    expect(screen.getByText('1.20')).toBeInTheDocument();
  });

  it('distinguishes a no-match search from a truly empty catalog', async () => {
    mock.onGet('/products').reply(200, []);
    mock.onGet('/categories').reply(200, []);
    renderPage();
    // No search yet → truly-empty copy.
    await waitFor(() =>
      expect(screen.getByText('The product catalog is empty.')).toBeInTheDocument(),
    );
    // With a search term → no-match copy.
    await userEvent.type(screen.getByLabelText('Search catalog'), 'zzz');
    await waitFor(() =>
      expect(screen.getByText('No products match your search.')).toBeInTheDocument(),
    );
  });

  it('shows NO management controls (no create/edit/delete buttons)', async () => {
    mock.onGet('/products').reply(200, [PRODUCT]);
    mock.onGet('/categories').reply(200, [CATEGORY]);
    renderPage();
    await waitFor(() => expect(screen.getByText('Cola')).toBeInTheDocument());
    expect(screen.queryByRole('button', { name: /new product/i })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /edit/i })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /archive|delete/i })).not.toBeInTheDocument();
  });
});
