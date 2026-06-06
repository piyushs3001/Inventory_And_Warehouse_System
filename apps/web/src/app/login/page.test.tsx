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
    await userEvent.type(screen.getByLabelText(/password/i), 'Admin@12345');
    await userEvent.click(screen.getByRole('button', { name: /sign in/i }));
    expect(login).toHaveBeenCalledWith('admin@iws.local', 'Admin@12345');
  });
});
