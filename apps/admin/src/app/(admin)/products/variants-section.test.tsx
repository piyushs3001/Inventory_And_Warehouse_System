import { describe, it, expect, beforeEach } from 'vitest';
import '@testing-library/jest-dom/vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import MockAdapter from 'axios-mock-adapter';
import { AXIOS_INSTANCE } from '@iws/api-client';
import { ConfirmProvider } from '@iws/ui';
import { VariantsSection } from './variants-section';

let mock: MockAdapter;
beforeEach(() => {
  mock = new MockAdapter(AXIOS_INSTANCE);
});

const renderSection = () =>
  render(
    <ConfirmProvider>
      <QueryClientProvider client={new QueryClient()}>
        <VariantsSection productId="p1" />
      </QueryClientProvider>
    </ConfirmProvider>,
  );

describe('VariantsSection (admin)', () => {
  it('creates a variant with a key/value attribute', async () => {
    mock.onGet('/products/p1/variants').reply(200, []);
    mock.onPost('/products/p1/variants').reply(201, {});
    renderSection();

    await waitFor(() =>
      expect(screen.getByText(/no variants yet/i)).toBeInTheDocument(),
    );
    await userEvent.click(screen.getByRole('button', { name: /add variant/i }));
    await userEvent.type(screen.getByLabelText('Variant SKU'), 'COLA-1-RED');
    await userEvent.type(screen.getByLabelText('Attribute name 1'), 'color');
    await userEvent.type(screen.getByLabelText('Attribute value 1'), 'Red');
    await userEvent.click(
      screen.getByRole('button', { name: /^add variant$/i }),
    );

    await waitFor(() => expect(mock.history.post.length).toBe(1));
    const sent = JSON.parse(mock.history.post[0].data as string);
    expect(sent).toMatchObject({
      sku: 'COLA-1-RED',
      attributes: { color: 'Red' },
    });
  });

  it('surfaces a 409 duplicate-SKU error inline', async () => {
    mock.onGet('/products/p1/variants').reply(200, []);
    mock
      .onPost('/products/p1/variants')
      .reply(409, { message: 'A variant with this SKU already exists' });
    renderSection();

    await userEvent.click(screen.getByRole('button', { name: /add variant/i }));
    await userEvent.type(screen.getByLabelText('Variant SKU'), 'COLA-1');
    await userEvent.click(
      screen.getByRole('button', { name: /^add variant$/i }),
    );

    await waitFor(() =>
      expect(screen.getByRole('alert')).toHaveTextContent(
        'A variant with this SKU already exists',
      ),
    );
  });

  it('lists existing variants with their attributes', async () => {
    mock.onGet('/products/p1/variants').reply(200, [
      {
        id: 'v1', productId: 'p1', sku: 'COLA-1-RED', barcode: null,
        attributes: { color: 'Red' }, status: 'ACTIVE', createdAt: '',
      },
    ]);
    renderSection();
    await waitFor(() =>
      expect(screen.getByText('COLA-1-RED')).toBeInTheDocument(),
    );
    expect(screen.getByText('color: Red')).toBeInTheDocument();
  });

  it('toggles a variant barcode and renders the generated image', async () => {
    mock.onGet('/products/p1/variants').reply(200, [
      {
        id: 'v1', productId: 'p1', sku: 'COLA-1-RED', barcode: null,
        attributes: {}, status: 'ACTIVE', createdAt: '',
      },
    ]);
    mock.onGet(/\/products\/p1\/variants\/v1\/barcode/).reply(200, {
      value: 'COLA-1-RED',
      symbology: 'code128',
      png: 'data:image/png;base64,AAA',
    });
    renderSection();
    await waitFor(() =>
      expect(screen.getByText('COLA-1-RED')).toBeInTheDocument(),
    );

    await userEvent.click(screen.getByRole('button', { name: 'Barcode' }));
    const img = await screen.findByRole('img', { name: /barcode for COLA-1-RED/i });
    expect(img).toHaveAttribute('src', 'data:image/png;base64,AAA');
  });
});
