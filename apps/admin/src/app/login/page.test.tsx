import { describe, it, expect, vi, beforeEach } from 'vitest';
import '@testing-library/jest-dom/vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import LoginPage from './page';

const login = vi.fn().mockResolvedValue(undefined);
const replace = vi.fn();
vi.mock('@iws/auth', () => ({
  useAuth: () => ({ login, status: 'unauthenticated', user: null, logout: vi.fn() }),
}));
vi.mock('next/navigation', () => ({ useRouter: () => ({ replace }) }));

beforeEach(() => { login.mockClear(); replace.mockClear(); });

describe('AdminLoginPage', () => {
  it('is sign-in only — no Create-account tab or register form', () => {
    render(<LoginPage />);
    expect(screen.getByRole('heading', { name: /admin sign in/i })).toBeInTheDocument();
    expect(screen.queryByRole('tab', { name: /create account/i })).not.toBeInTheDocument();
    expect(screen.queryByLabelText('Full name')).not.toBeInTheDocument();
    // Links staff members to the staff app instead of offering self-registration.
    expect(screen.getByRole('link', { name: /go to the staff app/i })).toBeInTheDocument();
  });

  it('submits credentials and redirects on success', async () => {
    render(<LoginPage />);
    await userEvent.type(screen.getByLabelText(/email/i), 'admin@iws.local');
    await userEvent.type(screen.getByLabelText('Password'), 'Admin@12345');
    await userEvent.click(screen.getByRole('button', { name: /^sign in$/i }));
    expect(login).toHaveBeenCalledWith('admin@iws.local', 'Admin@12345');
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
