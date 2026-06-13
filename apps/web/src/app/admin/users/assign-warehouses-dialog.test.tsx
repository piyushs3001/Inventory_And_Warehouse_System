import { describe, it, expect, vi, beforeEach } from 'vitest';
import '@testing-library/jest-dom/vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import MockAdapter from 'axios-mock-adapter';
import { AXIOS_INSTANCE } from '@/lib/api/axios';
import { AssignWarehousesDialog } from './assign-warehouses-dialog';
import type { UserDto } from '@/lib/api/generated/model';

const user: UserDto = {
  id: '1',
  name: 'Jane',
  email: 'jane@iws.local',
  role: 'STAFF',
  status: 'ACTIVE',
  createdAt: '',
  updatedAt: '',
  warehouses: [],
};

let mock: MockAdapter;
beforeEach(() => {
  mock = new MockAdapter(AXIOS_INSTANCE);
  mock.onGet('/warehouses').reply(200, [
    { id: 'w1', name: 'Central Warehouse' },
    { id: 'w2', name: 'North Depot' },
  ]);
});

const renderDialog = (onClose = vi.fn()) =>
  render(
    <QueryClientProvider client={new QueryClient()}>
      <AssignWarehousesDialog user={user} onClose={onClose} />
    </QueryClientProvider>,
  );

describe('AssignWarehousesDialog', () => {
  it('saves the selected warehouse ids', async () => {
    const onClose = vi.fn();
    mock.onPut('/users/1/warehouses').reply(200, { ...user });
    renderDialog(onClose);

    await waitFor(() => screen.getByText('Central Warehouse'));
    await userEvent.click(screen.getByLabelText('Central Warehouse'));
    await userEvent.click(screen.getByRole('button', { name: /save/i }));

    await waitFor(() => expect(onClose).toHaveBeenCalled());
    expect(JSON.parse(mock.history.put[0].data)).toEqual({ warehouseIds: ['w1'] });
  });
});
