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

describe('CatalogPage (staff, read-only list)', () => {
  it('renders the catalog with selling price and category', async () => {
    mock.onGet('/products').reply(200, [PRODUCT]);
    mock.onGet('/categories').reply(200, [CATEGORY]);
    renderPage();
    await waitFor(() => expect(screen.getByText('Cola')).toBeInTheDocument());
    expect(screen.getByText('COLA-1')).toBeInTheDocument();
    expect(screen.getByText('1.20')).toBeInTheDocument();
    expect(screen.getByText('Beverages')).toBeInTheDocument();
  });

  it('links each row to its read-only detail page', async () => {
    mock.onGet('/products').reply(200, [PRODUCT]);
    mock.onGet('/categories').reply(200, [CATEGORY]);
    renderPage();
    await waitFor(() => expect(screen.getByText('Cola')).toBeInTheDocument());
    expect(screen.getByRole('link', { name: /view/i })).toHaveAttribute(
      'href',
      '/catalog/p1',
    );
  });

  it('filters the list by name or SKU via client-side search', async () => {
    const OTHER = { ...PRODUCT, id: 'p2', name: 'Water', sku: 'WTR-1' };
    mock.onGet('/products').reply(200, [PRODUCT, OTHER]);
    mock.onGet('/categories').reply(200, [CATEGORY]);
    renderPage();
    await waitFor(() => expect(screen.getByText('Cola')).toBeInTheDocument());
    await userEvent.type(screen.getByLabelText('Search'), 'wtr');
    await waitFor(() => expect(screen.queryByText('Cola')).not.toBeInTheDocument());
    expect(screen.getByText('Water')).toBeInTheDocument();
  });

  it('shows the empty-state for a truly empty catalog', async () => {
    mock.onGet('/products').reply(200, []);
    mock.onGet('/categories').reply(200, []);
    renderPage();
    await waitFor(() =>
      expect(screen.getByText('The product catalog is empty.')).toBeInTheDocument(),
    );
  });

  it('shows NO management controls (no create/edit/delete buttons)', async () => {
    mock.onGet('/products').reply(200, [PRODUCT]);
    mock.onGet('/categories').reply(200, [CATEGORY]);
    renderPage();
    await waitFor(() => expect(screen.getByText('Cola')).toBeInTheDocument());
    expect(screen.queryByRole('link', { name: /new product/i })).not.toBeInTheDocument();
    expect(screen.queryByRole('link', { name: /edit/i })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /archive|delete/i })).not.toBeInTheDocument();
  });
});
