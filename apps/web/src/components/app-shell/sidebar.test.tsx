import { describe, it, expect, vi } from 'vitest';
import '@testing-library/jest-dom/vitest';
import { render, screen } from '@testing-library/react';

vi.mock('next/navigation', () => ({ usePathname: () => '/admin/users', useRouter: () => ({ replace: vi.fn() }) }));
vi.mock('@/lib/auth/auth-context', () => ({ useAuth: () => ({ user: { name: 'Admin', role: 'SUPER_ADMIN' }, logout: vi.fn() }) }));

import { Sidebar } from './sidebar';
import { Role } from '@/lib/api/generated/model';

describe('Sidebar', () => {
  it('shows admin Manage items for SUPER_ADMIN and marks the active route', () => {
    render(<Sidebar surface="admin" role={Role.SUPER_ADMIN} />);
    expect(screen.getByText('Manage')).toBeInTheDocument();
    const users = screen.getByRole('link', { name: /users/i });
    expect(users).toHaveAttribute('aria-current', 'page'); // pathname = /admin/users
    expect(screen.getByRole('link', { name: /warehouses/i })).toBeInTheDocument();
  });

  it('staff surface for a STAFF role shows Home, never admin items', () => {
    render(<Sidebar surface="staff" role={Role.STAFF} />);
    expect(screen.getByRole('link', { name: /home/i })).toBeInTheDocument();
    expect(screen.queryByRole('link', { name: /users/i })).not.toBeInTheDocument();
  });
});
