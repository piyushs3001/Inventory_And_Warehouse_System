import { describe, it, expect, beforeEach, vi } from 'vitest';
import '@testing-library/jest-dom/vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import MockAdapter from 'axios-mock-adapter';
import { AXIOS_INSTANCE } from '@iws/api-client';
import CatalogDetailPage from './page';

vi.mock('next/navigation', () => ({ useParams: () => ({ id: 'p1' }) }));

let mock: MockAdapter;
beforeEach(() => { mock = new MockAdapter(AXIOS_INSTANCE); });

const CATEGORY = { id: 'cat1', name: 'Beverages', parentId: null, createdAt: '' };
const PRODUCT = {
  id: 'p1', name: 'Cola', sku: 'COLA-1', description: 'Fizzy', categoryId: 'cat1',
  unit: 'can', costPrice: '0.45', sellingPrice: '1.20', reorderLevel: 50,
  status: 'ACTIVE', createdAt: '',
};
const VARIANT = {
  id: 'v1', productId: 'p1', sku: 'COLA-1-RED', barcode: null,
  attributes: { color: 'Red' }, status: 'ACTIVE', createdAt: '',
};

const renderPage = () =>
  render(
    <QueryClientProvider
      client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}
    >
      <CatalogDetailPage />
    </QueryClientProvider>,
  );

describe('CatalogDetailPage (staff, read-only)', () => {
  it('renders product info and its read-only variants list', async () => {
    mock.onGet('/products/p1').reply(200, PRODUCT);
    mock.onGet('/categories').reply(200, [CATEGORY]);
    mock.onGet('/products/p1/variants').reply(200, [VARIANT]);
    renderPage();

    await waitFor(() => expect(screen.getByText('Cola')).toBeInTheDocument());
    expect(screen.getByText('COLA-1')).toBeInTheDocument();
    // category + variants come from secondary queries — await them
    await waitFor(() => expect(screen.getByText('Beverages')).toBeInTheDocument());
    await waitFor(() => expect(screen.getByText('COLA-1-RED')).toBeInTheDocument());
    expect(screen.getByText('color: Red')).toBeInTheDocument();
  });

  it('shows NO management controls (no edit/archive)', async () => {
    mock.onGet('/products/p1').reply(200, PRODUCT);
    mock.onGet('/categories').reply(200, [CATEGORY]);
    mock.onGet('/products/p1/variants').reply(200, [VARIANT]);
    renderPage();
    await waitFor(() => expect(screen.getByText('Cola')).toBeInTheDocument());
    expect(screen.queryByRole('link', { name: /edit/i })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /archive|delete|save/i })).not.toBeInTheDocument();
  });

  it('shows a read-only barcode for a variant on demand', async () => {
    mock.onGet('/products/p1').reply(200, PRODUCT);
    mock.onGet('/categories').reply(200, [CATEGORY]);
    mock.onGet('/products/p1/variants').reply(200, [VARIANT]);
    mock.onGet(/\/products\/p1\/variants\/v1\/barcode/).reply(200, {
      value: 'COLA-1-RED', symbology: 'code128', png: 'data:image/png;base64,AAA',
    });
    renderPage();
    await waitFor(() => expect(screen.getByText('COLA-1-RED')).toBeInTheDocument());
    await userEvent.click(screen.getByRole('button', { name: /show barcode/i }));
    const img = await screen.findByRole('img', { name: /barcode for COLA-1-RED/i });
    expect(img).toHaveAttribute('src', 'data:image/png;base64,AAA');
  });

  it('shows a not-found error when the product is missing', async () => {
    mock.onGet('/products/p1').reply(404);
    mock.onGet('/categories').reply(200, []);
    renderPage();
    await waitFor(() =>
      expect(screen.getByText('Product not found')).toBeInTheDocument(),
    );
  });
});
