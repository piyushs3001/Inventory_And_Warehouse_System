import { describe, it, expect, vi, beforeEach } from 'vitest';
import '@testing-library/jest-dom/vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import MockAdapter from 'axios-mock-adapter';
import { AXIOS_INSTANCE } from '@iws/api-client';
import { WarehouseFormDialog } from './warehouse-form-dialog';
import type { WarehouseDto } from '@iws/api-client';

let mock: MockAdapter;
beforeEach(() => { mock = new MockAdapter(AXIOS_INSTANCE); });

const onSuccess = vi.fn().mockResolvedValue(undefined);

const renderDialog = (onClose = vi.fn(), warehouse?: WarehouseDto) =>
  render(
    <QueryClientProvider client={new QueryClient()}>
      <WarehouseFormDialog
        warehouse={warehouse}
        onClose={onClose}
        onSuccess={onSuccess}
      />
    </QueryClientProvider>,
  );

describe('WarehouseFormDialog (create)', () => {
  it('posts a new warehouse and closes', async () => {
    const onClose = vi.fn();
    mock.onPost('/warehouses').reply(201, { id: 'w1' });
    renderDialog(onClose);

    await userEvent.type(screen.getByLabelText(/name/i), 'East Hub');
    await userEvent.click(screen.getByRole('button', { name: /create/i }));

    await waitFor(() => expect(onClose).toHaveBeenCalled());
    expect(JSON.parse(mock.history.post[0].data)).toMatchObject({ name: 'East Hub' });
  });

  it('shows an error when create fails', async () => {
    mock.onPost('/warehouses').reply(500);
    renderDialog();

    await userEvent.type(screen.getByLabelText(/name/i), 'Bad Hub');
    await userEvent.click(screen.getByRole('button', { name: /create/i }));

    await waitFor(() =>
      expect(screen.getByRole('alert')).toHaveTextContent(/could not save warehouse/i),
    );
  });
});

describe('WarehouseFormDialog (edit)', () => {
  it('patches existing warehouse and closes', async () => {
    const onClose = vi.fn();
    const existing: WarehouseDto = {
      id: 'w1',
      name: 'Old Name',
      status: 'ACTIVE',
      capacity: 100,
      contactPerson: 'Bob',
      address: '1 St',
      createdAt: '',
    };
    mock.onPatch('/warehouses/w1').reply(200, { ...existing, name: 'New Name' });

    renderDialog(onClose, existing);

    // Name field should be pre-filled
    const nameInput = screen.getByLabelText(/name/i);
    expect(nameInput).toHaveValue('Old Name');

    await userEvent.clear(nameInput);
    await userEvent.type(nameInput, 'New Name');
    await userEvent.click(screen.getByRole('button', { name: /save/i }));

    await waitFor(() => expect(onClose).toHaveBeenCalled());
    expect(mock.history.patch).toHaveLength(1);
    expect(JSON.parse(mock.history.patch[0].data)).toMatchObject({ name: 'New Name' });
  });
});
