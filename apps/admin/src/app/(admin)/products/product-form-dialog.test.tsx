import { describe, it, expect, beforeEach, vi } from 'vitest';
import '@testing-library/jest-dom/vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import MockAdapter from 'axios-mock-adapter';
import { AXIOS_INSTANCE } from '@iws/api-client';
import { ProductFormDialog } from './product-form-dialog';

let mock: MockAdapter;
beforeEach(() => { mock = new MockAdapter(AXIOS_INSTANCE); });

const CATEGORY = { id: 'cat1', name: 'Beverages', parentId: null, createdAt: '' };

const renderDialog = (props: Partial<Parameters<typeof ProductFormDialog>[0]> = {}) =>
  render(
    <QueryClientProvider client={new QueryClient()}>
      <ProductFormDialog
        categories={[CATEGORY]}
        onClose={() => {}}
        onSuccess={async () => {}}
        {...props}
      />
    </QueryClientProvider>,
  );

describe('ProductFormDialog', () => {
  it('creates a product, sending numeric prices', async () => {
    const onSuccess = vi.fn(async () => {});
    mock.onPost('/products').reply(201, {});
    renderDialog({ onSuccess });

    await userEvent.type(screen.getByLabelText('Name'), 'Cola');
    await userEvent.type(screen.getByLabelText('SKU'), 'COLA-1');
    await userEvent.type(screen.getByLabelText('Cost price'), '0.45');
    await userEvent.click(screen.getByRole('button', { name: /create/i }));

    await waitFor(() => expect(onSuccess).toHaveBeenCalled());
    const sent = JSON.parse(mock.history.post[0].data as string);
    expect(sent).toMatchObject({ name: 'Cola', sku: 'COLA-1', costPrice: 0.45 });
  });

  it('surfaces a 409 duplicate-SKU error inline', async () => {
    mock.onPost('/products').reply(409, { message: 'A product with this SKU already exists' });
    renderDialog();

    await userEvent.type(screen.getByLabelText('Name'), 'Dup');
    await userEvent.type(screen.getByLabelText('SKU'), 'COLA-1');
    await userEvent.click(screen.getByRole('button', { name: /create/i }));

    await waitFor(() =>
      expect(screen.getByRole('alert')).toHaveTextContent(
        'A product with this SKU already exists',
      ),
    );
  });
});
