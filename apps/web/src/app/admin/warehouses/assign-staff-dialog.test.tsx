import { describe, it, expect, vi, beforeEach } from 'vitest';
import '@testing-library/jest-dom/vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import MockAdapter from 'axios-mock-adapter';
import { AXIOS_INSTANCE } from '@/lib/api/axios';
import { AssignStaffDialog } from './assign-staff-dialog';
import type { WarehouseDto } from '@/lib/api/generated/model';

const warehouse: WarehouseDto = {
  id: 'w1',
  name: 'Central Warehouse',
  status: 'ACTIVE',
  capacity: null,
  contactPerson: null,
  address: null,
  createdAt: '',
};

let mock: MockAdapter;
beforeEach(() => {
  mock = new MockAdapter(AXIOS_INSTANCE);
  mock.onGet('/users').reply(200, [
    {
      id: 'u1',
      name: 'Alice',
      email: 'alice@iws.local',
      role: 'STAFF',
      status: 'ACTIVE',
      createdAt: '',
      updatedAt: '',
      warehouses: [{ id: 'w1', name: 'Central Warehouse' }],
    },
    {
      id: 'u2',
      name: 'Bob',
      email: 'bob@iws.local',
      role: 'STAFF',
      status: 'ACTIVE',
      createdAt: '',
      updatedAt: '',
      warehouses: [],
    },
  ]);
});

const renderDialog = (currentStaffIds: string[] = [], onClose = vi.fn()) =>
  render(
    <QueryClientProvider client={new QueryClient()}>
      <AssignStaffDialog
        warehouse={warehouse}
        currentStaffIds={currentStaffIds}
        onClose={onClose}
        onSuccess={async () => {}}
      />
    </QueryClientProvider>,
  );

describe('AssignStaffDialog', () => {
  it('pre-checks users already assigned to this warehouse', async () => {
    renderDialog(['u1']);

    await waitFor(() => screen.getByLabelText('Alice'));
    expect(screen.getByLabelText('Alice')).toBeChecked();
    expect(screen.getByLabelText('Bob')).not.toBeChecked();
  });

  it('submits the selected user ids via POST /warehouses/:id/staff', async () => {
    const onClose = vi.fn();
    mock.onPost('/warehouses/w1/staff').reply(200, {});
    renderDialog([], onClose);

    await waitFor(() => screen.getByLabelText('Alice'));
    await userEvent.click(screen.getByLabelText('Alice'));
    await userEvent.click(screen.getByRole('button', { name: /save/i }));

    await waitFor(() => expect(onClose).toHaveBeenCalled());
    expect(JSON.parse(mock.history.post[0].data)).toEqual({ userIds: ['u1'] });
  });
});
