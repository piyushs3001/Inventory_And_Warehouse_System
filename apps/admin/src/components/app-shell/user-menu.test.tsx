import { describe, it, expect, vi } from 'vitest';
import '@testing-library/jest-dom/vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';

const logout = vi.fn().mockResolvedValue(undefined);
const replace = vi.fn();
vi.mock('@iws/auth', () => ({
  useAuth: () => ({ user: { name: 'Rosa Martins', role: 'SUPER_ADMIN' }, logout }),
}));
vi.mock('next/navigation', () => ({ useRouter: () => ({ replace }) }));

import { UserMenu } from './user-menu';

describe('UserMenu', () => {
  it('shows name + role and logs out', async () => {
    render(<UserMenu />);
    expect(screen.getByText('Rosa Martins')).toBeInTheDocument();
    expect(screen.getByText('Super Admin')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: /log out/i }));
    await waitFor(() => expect(logout).toHaveBeenCalled());
  });
});
