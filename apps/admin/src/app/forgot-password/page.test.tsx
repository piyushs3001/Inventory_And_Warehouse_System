import { describe, it, expect, vi, beforeEach } from 'vitest';
import '@testing-library/jest-dom/vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import ForgotPasswordPage from './page';

const forgotFn = vi.fn().mockResolvedValue({ message: 'ok' });
vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn(), replace: vi.fn() }),
}));
vi.mock('@iws/api-client', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@iws/api-client')>()),
  authControllerForgotPassword: (...args: unknown[]) => forgotFn(...args),
}));

beforeEach(() => {
  forgotFn.mockClear();
  forgotFn.mockResolvedValue({ message: 'ok' });
});

describe('ForgotPasswordPage (admin)', () => {
  it('submits the email tagged app=admin and shows a generic confirmation', async () => {
    render(<ForgotPasswordPage />);
    await userEvent.type(screen.getByLabelText(/email/i), 'admin@iws.local');
    await userEvent.click(
      screen.getByRole('button', { name: /send reset link/i }),
    );
    expect(forgotFn).toHaveBeenCalledWith({
      email: 'admin@iws.local',
      app: 'admin',
    });
    expect(await screen.findByText(/if an account exists/i)).toBeInTheDocument();
  });

  it('shows a network error without leaking account existence', async () => {
    forgotFn.mockRejectedValueOnce(new Error('Network Error'));
    render(<ForgotPasswordPage />);
    await userEvent.type(screen.getByLabelText(/email/i), 'admin@iws.local');
    await userEvent.click(
      screen.getByRole('button', { name: /send reset link/i }),
    );
    expect(await screen.findByRole('alert')).toHaveTextContent(
      /unable to reach the server/i,
    );
  });
});
