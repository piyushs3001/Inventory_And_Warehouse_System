import { describe, it, expect, vi } from 'vitest';
import '@testing-library/jest-dom/vitest';
import { render, screen } from '@testing-library/react';

vi.mock('next/navigation', () => ({ usePathname: () => '/users', useRouter: () => ({ replace: vi.fn() }) }));
vi.mock('@iws/auth', () => ({ useAuth: () => ({ user: { name: 'Admin', role: 'SUPER_ADMIN' }, logout: vi.fn() }) }));

import { Sidebar } from './sidebar';
import { Role } from '@iws/api-client';

describe('Sidebar (admin)', () => {
  it('shows the Manage group for SUPER_ADMIN and marks the active route', () => {
    render(<Sidebar surface="admin" role={Role.SUPER_ADMIN} />);
    expect(screen.getByText('Manage')).toBeInTheDocument();
    const users = screen.getByRole('link', { name: /users/i });
    expect(users).toHaveAttribute('aria-current', 'page'); // pathname = /users
    expect(screen.getByRole('link', { name: /warehouses/i })).toBeInTheDocument();
  });

  it('renders a count badge on Purchase Orders', () => {
    render(<Sidebar surface="admin" role={Role.SUPER_ADMIN} />);
    const poLink = screen.getByRole('link', { name: /purchase orders/i });
    expect(poLink).toHaveTextContent('14');
  });
});
