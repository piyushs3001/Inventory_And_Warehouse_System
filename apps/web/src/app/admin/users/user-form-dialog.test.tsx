import { describe, it, expect, vi, beforeEach } from 'vitest';
import '@testing-library/jest-dom/vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import MockAdapter from 'axios-mock-adapter';
import { AXIOS_INSTANCE } from '@/lib/api/axios';
import { UserFormDialog } from './user-form-dialog';
import { Role, UserStatus } from '@/lib/api/generated/model';
import type { UserDto } from '@/lib/api/generated/model';

let mock: MockAdapter;
beforeEach(() => { mock = new MockAdapter(AXIOS_INSTANCE); });

const renderDialog = (onClose = vi.fn()) =>
  render(
    <QueryClientProvider client={new QueryClient()}>
      <UserFormDialog onClose={onClose} />
    </QueryClientProvider>,
  );

describe('UserFormDialog (create)', () => {
  it('posts a new user and closes', async () => {
    const onClose = vi.fn();
    mock.onPost('/users').reply(201, { id: '2' });
    renderDialog(onClose);

    await userEvent.type(screen.getByLabelText(/name/i), 'Jane Staff');
    await userEvent.type(screen.getByLabelText(/email/i), 'jane@iws.local');
    await userEvent.type(screen.getByLabelText(/password/i), 'Passw0rd!');
    await userEvent.click(screen.getByRole('button', { name: /create/i }));

    await waitFor(() => expect(onClose).toHaveBeenCalled());
    expect(JSON.parse(mock.history.post[0].data)).toMatchObject({
      name: 'Jane Staff', email: 'jane@iws.local',
    });
  });
});

describe('UserFormDialog (edit)', () => {
  it('patches existing user and closes', async () => {
    const onClose = vi.fn();
    const existingUser: UserDto = {
      id: '1',
      name: 'Alice Manager',
      email: 'alice@iws.local',
      role: Role.WAREHOUSE_MANAGER,
      status: UserStatus.ACTIVE,
      warehouses: [],
      createdAt: '2024-01-01T00:00:00.000Z',
      updatedAt: '2024-01-01T00:00:00.000Z',
    };
    mock.onPatch('/users/1').reply(200, { ...existingUser, name: 'Alice Updated' });
    mock.onGet('/users').reply(200, []);

    render(
      <QueryClientProvider client={new QueryClient()}>
        <UserFormDialog user={existingUser} onClose={onClose} />
      </QueryClientProvider>,
    );

    // Edit mode: email/password fields not shown; name pre-filled
    const nameInput = screen.getByLabelText(/name/i);
    expect(nameInput).toHaveValue('Alice Manager');
    expect(screen.queryByLabelText(/email/i)).not.toBeInTheDocument();

    await userEvent.clear(nameInput);
    await userEvent.type(nameInput, 'Alice Updated');
    await userEvent.click(screen.getByRole('button', { name: /save/i }));

    await waitFor(() => expect(onClose).toHaveBeenCalled());
    expect(mock.history.patch).toHaveLength(1);
    expect(JSON.parse(mock.history.patch[0].data)).toMatchObject({
      name: 'Alice Updated',
      role: Role.WAREHOUSE_MANAGER,
    });
  });
});
