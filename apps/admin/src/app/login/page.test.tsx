import { describe, it, expect, vi, beforeEach } from 'vitest';
import '@testing-library/jest-dom/vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import LoginPage from './page';

const login = vi.fn().mockResolvedValue(undefined);
const logout = vi.fn().mockResolvedValue(undefined);
const replace = vi.fn();
const roleFn = vi.fn<() => string | null>(() => 'SUPER_ADMIN');
vi.mock('@iws/auth', () => ({
  useAuth: () => ({ login, logout, status: 'unauthenticated', user: null }),
}));
vi.mock('next/navigation', () => ({ useRouter: () => ({ replace }) }));
vi.mock('@iws/api-client', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@iws/api-client')>()),
  getAccessRole: () => roleFn(),
}));

beforeEach(() => {
  login.mockClear();
  logout.mockClear();
  replace.mockClear();
  roleFn.mockReturnValue('SUPER_ADMIN');
});

describe('AdminLoginPage', () => {
  it('is sign-in only on the distinct Admin Portal layout (no Create-account tab/register)', () => {
    render(<LoginPage />);
    expect(screen.getByText('Admin Portal')).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: /sign in to continue/i })).toBeInTheDocument();
    expect(screen.queryByRole('tab', { name: /create account/i })).not.toBeInTheDocument();
    expect(screen.queryByLabelText('Full name')).not.toBeInTheDocument();
    expect(screen.getByRole('link', { name: /go to the staff app/i })).toBeInTheDocument();
  });

  it('submits credentials and redirects an admin on success', async () => {
    render(<LoginPage />);
    await userEvent.type(screen.getByLabelText(/email/i), 'admin@iws.local');
    await userEvent.type(screen.getByLabelText('Password'), 'Admin@12345');
    await userEvent.click(screen.getByRole('button', { name: /^sign in$/i }));
    expect(login).toHaveBeenCalledWith('admin@iws.local', 'Admin@12345');
    expect(replace).toHaveBeenCalledWith('/');
  });

  it('rejects a valid STAFF account in place, with a link to the Staff app', async () => {
    roleFn.mockReturnValue('STAFF');
    render(<LoginPage />);
    await userEvent.type(screen.getByLabelText(/email/i), 'staff@iws.local');
    await userEvent.type(screen.getByLabelText('Password'), 'Staff@12345');
    await userEvent.click(screen.getByRole('button', { name: /^sign in$/i }));
    expect(await screen.findByText(/doesn.t have access to the admin portal/i)).toBeInTheDocument();
    expect(logout).toHaveBeenCalled();
    expect(replace).not.toHaveBeenCalled();
    expect(screen.getByRole('link', { name: /open the staff app/i })).toBeInTheDocument();
  });

  it('shows the API message on a 401', async () => {
    login.mockRejectedValueOnce({ response: { status: 401, data: { message: 'Invalid credentials' } } });
    render(<LoginPage />);
    await userEvent.type(screen.getByLabelText(/email/i), 'admin@iws.local');
    await userEvent.type(screen.getByLabelText('Password'), 'nope');
    await userEvent.click(screen.getByRole('button', { name: /^sign in$/i }));
    expect(await screen.findByRole('alert')).toHaveTextContent('Invalid credentials');
  });

  it('shows a network message when the API is unreachable', async () => {
    login.mockRejectedValueOnce(new Error('Network Error'));
    render(<LoginPage />);
    await userEvent.type(screen.getByLabelText(/email/i), 'admin@iws.local');
    await userEvent.type(screen.getByLabelText('Password'), 'Admin@12345');
    await userEvent.click(screen.getByRole('button', { name: /^sign in$/i }));
    expect(await screen.findByRole('alert')).toHaveTextContent(/unable to reach the server/i);
  });

  it('password eye toggle reveals and re-masks', async () => {
    render(<LoginPage />);
    const pw = screen.getByLabelText('Password');
    expect(pw).toHaveAttribute('type', 'password');
    await userEvent.click(screen.getByRole('button', { name: /show password/i }));
    expect(pw).toHaveAttribute('type', 'text');
  });
});
