import { describe, it, expect, vi, beforeEach } from 'vitest';
import '@testing-library/jest-dom/vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import ResetPasswordPage from './page';

const resetFn = vi.fn().mockResolvedValue({ message: 'ok' });
const validateFn = vi.fn().mockResolvedValue({ valid: true });
let tokenParam = 'tok123';

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn(), replace: vi.fn() }),
  useSearchParams: () =>
    new URLSearchParams(tokenParam ? `token=${tokenParam}` : ''),
}));
vi.mock('@iws/api-client', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@iws/api-client')>()),
  authControllerResetPassword: (...args: unknown[]) => resetFn(...args),
  authControllerValidateResetToken: (...args: unknown[]) => validateFn(...args),
}));

beforeEach(() => {
  resetFn.mockClear();
  validateFn.mockClear();
  resetFn.mockResolvedValue({ message: 'ok' });
  validateFn.mockResolvedValue({ valid: true });
  tokenParam = 'tok123';
});

describe('ResetPasswordPage (admin)', () => {
  it('shows an invalid/expired state when the token does not validate', async () => {
    validateFn.mockResolvedValue({ valid: false });
    render(<ResetPasswordPage />);
    expect(
      await screen.findByText(/invalid or has expired/i),
    ).toBeInTheDocument();
    expect(screen.queryByLabelText('New password')).not.toBeInTheDocument();
  });

  it('blocks submit and never calls the API when passwords do not match', async () => {
    render(<ResetPasswordPage />);
    const pw = await screen.findByLabelText('New password');
    await userEvent.type(pw, 'newPassword1');
    await userEvent.type(screen.getByLabelText('Confirm password'), 'different1');
    await userEvent.click(screen.getByRole('button', { name: /reset password/i }));
    expect(await screen.findByText(/passwords do not match/i)).toBeInTheDocument();
    expect(resetFn).not.toHaveBeenCalled();
  });

  it('submits the token + new password and shows success', async () => {
    render(<ResetPasswordPage />);
    const pw = await screen.findByLabelText('New password');
    await userEvent.type(pw, 'newPassword1');
    await userEvent.type(screen.getByLabelText('Confirm password'), 'newPassword1');
    await userEvent.click(screen.getByRole('button', { name: /reset password/i }));
    expect(resetFn).toHaveBeenCalledWith({
      token: 'tok123',
      password: 'newPassword1',
    });
    expect(await screen.findByText(/password has been updated/i)).toBeInTheDocument();
  });
});
