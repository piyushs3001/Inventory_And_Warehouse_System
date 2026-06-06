import { describe, it, expect, vi, beforeEach } from 'vitest';
import '@testing-library/jest-dom/vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import MockAdapter from 'axios-mock-adapter';
import { AXIOS_INSTANCE } from '@/lib/api/axios';
import { UserFormDialog } from './user-form-dialog';

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
