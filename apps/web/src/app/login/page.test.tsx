import { describe, it, expect, vi, beforeEach } from 'vitest';
import '@testing-library/jest-dom/vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import LoginPage from './page';

const login = vi.fn().mockResolvedValue(undefined);
const replace = vi.fn();
const registerFn = vi.fn().mockResolvedValue({ id: 'u9', status: 'PENDING_APPROVAL' });
vi.mock('@/lib/auth/auth-context', () => ({
  useAuth: () => ({ login, status: 'unauthenticated', user: null, logout: vi.fn() }),
}));
vi.mock('next/navigation', () => ({ useRouter: () => ({ replace }) }));
vi.mock('@/lib/api/generated/auth/auth', () => ({
  authControllerRegister: (...args: unknown[]) => registerFn(...args),
}));

beforeEach(() => {
  login.mockClear();
  replace.mockClear();
  registerFn.mockClear();
  registerFn.mockResolvedValue({ id: 'u9', status: 'PENDING_APPROVAL' });
});

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

  it('surfaces the API message on a 403 (awaiting approval), not a network error', async () => {
    login.mockRejectedValueOnce({
      response: {
        status: 403,
        data: { message: 'Your account is awaiting administrator approval.' },
      },
    });
    render(<LoginPage />);
    await userEvent.type(screen.getByLabelText(/email/i), 'rosa@iws.local');
    await userEvent.type(screen.getByLabelText('Password'), 'Str0ng@Pass');
    await userEvent.click(screen.getByRole('button', { name: /sign in/i }));
    const alert = await screen.findByRole('alert');
    expect(alert).toHaveTextContent(/awaiting administrator approval/i);
    expect(alert).not.toHaveTextContent(/unable to reach the server/i);
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

describe('LoginPage auth tabs', () => {
  it('shows the sign-in panel by default with the tab selected', () => {
    render(<LoginPage />);
    expect(screen.getByRole('tab', { name: 'Sign in' })).toHaveAttribute('aria-selected', 'true');
    expect(screen.getByRole('tab', { name: 'Create account' })).toHaveAttribute('aria-selected', 'false');
    expect(screen.getByRole('button', { name: /sign in/i })).toBeInTheDocument();
  });

  it('switches to the register panel and back', async () => {
    const user = userEvent.setup();
    render(<LoginPage />);
    await user.click(screen.getByRole('tab', { name: 'Create account' }));
    expect(screen.getByRole('tab', { name: 'Create account' })).toHaveAttribute('aria-selected', 'true');
    expect(screen.getByLabelText('Full name')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /create account/i })).toBeInTheDocument();

    await user.click(screen.getByRole('tab', { name: 'Sign in' }));
    expect(screen.getByLabelText('Work email')).toBeInTheDocument();
    expect(screen.queryByLabelText('Full name')).not.toBeInTheDocument();
  });

  it('"New to IWS? Create an account" link also opens the register panel', async () => {
    const user = userEvent.setup();
    render(<LoginPage />);
    await user.click(screen.getByRole('button', { name: 'Create an account' }));
    expect(screen.getByLabelText('Full name')).toBeInTheDocument();
  });
});

describe('LoginPage registration', () => {
  async function openRegister(user: ReturnType<typeof userEvent.setup>) {
    await user.click(screen.getByRole('tab', { name: 'Create account' }));
    await user.type(screen.getByLabelText('Full name'), 'Rosa Martins');
    await user.type(screen.getByLabelText('Work email'), 'rosa@company.com');
    await user.type(screen.getByLabelText('Password'), 'S3curePass!');
    await user.type(screen.getByLabelText('Confirm password'), 'S3curePass!');
  }

  it('submits register, then shows the awaiting-approval banner on the sign-in tab', async () => {
    const user = userEvent.setup();
    render(<LoginPage />);
    await openRegister(user);
    await user.click(screen.getByRole('button', { name: /create account/i }));

    expect(registerFn).toHaveBeenCalledWith({
      name: 'Rosa Martins',
      email: 'rosa@company.com',
      password: 'S3curePass!',
    });
    expect(await screen.findByText(/awaiting administrator approval/i)).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: 'Sign in' })).toHaveAttribute('aria-selected', 'true');
    expect(login).not.toHaveBeenCalled();
  });

  it('blocks submit and never calls the API when passwords do not match', async () => {
    const user = userEvent.setup();
    render(<LoginPage />);
    await user.click(screen.getByRole('tab', { name: 'Create account' }));
    await user.type(screen.getByLabelText('Full name'), 'Rosa');
    await user.type(screen.getByLabelText('Work email'), 'rosa@company.com');
    await user.type(screen.getByLabelText('Password'), 'S3curePass!');
    await user.type(screen.getByLabelText('Confirm password'), 'different!');
    await user.click(screen.getByRole('button', { name: /create account/i }));

    expect(await screen.findByText(/passwords do not match/i)).toBeInTheDocument();
    expect(registerFn).not.toHaveBeenCalled();
  });

  it('surfaces a duplicate-email (409) error from the API', async () => {
    const user = userEvent.setup();
    registerFn.mockRejectedValueOnce({
      response: { status: 409, data: { message: 'Email already in use' } },
    });
    render(<LoginPage />);
    await openRegister(user);
    await user.click(screen.getByRole('button', { name: /create account/i }));

    expect(await screen.findByText(/email already in use/i)).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: 'Create account' })).toHaveAttribute('aria-selected', 'true');
  });
});

describe('LoginPage pending (no-backend) controls', () => {
  it('"Continue with SSO" shows a not-configured notice', async () => {
    const user = userEvent.setup();
    render(<LoginPage />);
    await user.click(screen.getByRole('button', { name: /continue with sso/i }));
    expect(screen.getByText(/single sign-on isn.t configured yet/i)).toBeInTheDocument();
    expect(login).not.toHaveBeenCalled();
  });

  it('"Forgot password?" shows an unavailable notice', async () => {
    const user = userEvent.setup();
    render(<LoginPage />);
    await user.click(screen.getByRole('button', { name: /forgot password/i }));
    expect(screen.getByText(/password reset isn.t available yet/i)).toBeInTheDocument();
  });
});
