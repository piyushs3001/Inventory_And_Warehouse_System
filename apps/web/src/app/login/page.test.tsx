import { describe, it, expect, vi, beforeEach } from 'vitest';
import '@testing-library/jest-dom/vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import LoginPage from './page';

const login = vi.fn().mockResolvedValue(undefined);
const replace = vi.fn();
vi.mock('@/lib/auth/auth-context', () => ({
  useAuth: () => ({ login, status: 'unauthenticated', user: null, logout: vi.fn() }),
}));
vi.mock('next/navigation', () => ({ useRouter: () => ({ replace }) }));

beforeEach(() => { login.mockClear(); replace.mockClear(); });

describe('LoginPage', () => {
  it('submits credentials and redirects on success', async () => {
    render(<LoginPage />);
    await userEvent.type(screen.getByLabelText(/email/i), 'admin@iws.local');
    // Exact 'Password' so this never matches the "Show password" toggle's aria-label.
    await userEvent.type(screen.getByLabelText('Password'), 'Admin@12345');
    await userEvent.click(screen.getByRole('button', { name: /sign in/i }));
    expect(login).toHaveBeenCalledWith('admin@iws.local', 'Admin@12345');
  });

  it('shows the API message on a real 401 with a body', async () => {
    login.mockRejectedValueOnce({
      response: {
        status: 401,
        data: {
          statusCode: 401,
          error: 'Unauthorized',
          message: 'Invalid email or password',
          timestamp: '2026-06-15T10:00:00.000Z',
          path: '/auth/login',
        },
      },
    });
    render(<LoginPage />);
    await userEvent.type(screen.getByLabelText(/email/i), 'admin@iws.local');
    await userEvent.type(screen.getByLabelText('Password'), 'whatever');
    await userEvent.click(screen.getByRole('button', { name: /sign in/i }));
    expect(await screen.findByRole('alert')).toHaveTextContent('Invalid email or password');
  });

  it('falls back to "Invalid credentials" on a 401 with no body message', async () => {
    login.mockRejectedValueOnce({ response: { status: 401 } });
    render(<LoginPage />);
    await userEvent.type(screen.getByLabelText(/email/i), 'admin@iws.local');
    await userEvent.type(screen.getByLabelText('Password'), 'whatever');
    await userEvent.click(screen.getByRole('button', { name: /sign in/i }));
    expect(await screen.findByRole('alert')).toHaveTextContent('Invalid credentials');
  });

  it('shows a network message (not "Invalid credentials") when the API is unreachable', async () => {
    // No response.status — mimics a CORS/network failure (axios "Failed to fetch").
    login.mockRejectedValueOnce(new Error('Network Error'));
    render(<LoginPage />);
    await userEvent.type(screen.getByLabelText(/email/i), 'admin@iws.local');
    await userEvent.type(screen.getByLabelText('Password'), 'Admin@12345');
    await userEvent.click(screen.getByRole('button', { name: /sign in/i }));
    const alert = await screen.findByRole('alert');
    expect(alert).toHaveTextContent(/unable to reach the server/i);
    expect(alert).not.toHaveTextContent(/invalid credentials/i);
  });
});

describe('LoginPage password visibility toggle', () => {
  it('masks the password by default and shows a "Show password" toggle', () => {
    render(<LoginPage />);
    expect(screen.getByLabelText('Password')).toHaveAttribute('type', 'password');
    expect(screen.getByRole('button', { name: /show password/i })).toBeInTheDocument();
  });

  it('reveals the password on click and re-masks on a second click', async () => {
    const user = userEvent.setup();
    render(<LoginPage />);
    const password = screen.getByLabelText('Password');

    await user.click(screen.getByRole('button', { name: /show password/i }));
    expect(password).toHaveAttribute('type', 'text');
    expect(screen.getByRole('button', { name: /hide password/i })).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: /hide password/i }));
    expect(password).toHaveAttribute('type', 'password');
    expect(screen.getByRole('button', { name: /show password/i })).toBeInTheDocument();
  });

  it('toggle is type="button" so it does not submit the form', async () => {
    const user = userEvent.setup();
    render(<LoginPage />);
    const toggle = screen.getByRole('button', { name: /show password/i });
    expect(toggle).toHaveAttribute('type', 'button');
    await user.click(toggle);
    expect(login).not.toHaveBeenCalled();
  });
});
