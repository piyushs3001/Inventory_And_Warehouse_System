import { describe, it, expect, vi } from 'vitest';
import '@testing-library/jest-dom/vitest';
import { render, screen } from '@testing-library/react';

vi.mock('next/navigation', () => ({ usePathname: () => '/home', useRouter: () => ({ replace: vi.fn() }) }));
vi.mock('@iws/auth', () => ({ useAuth: () => ({ user: { name: 'Sam', role: 'STAFF' }, logout: vi.fn() }) }));

import { Sidebar } from './sidebar';
import { Role } from '@iws/api-client';

describe('Sidebar (staff)', () => {
  it('shows Home for STAFF, marks the active route, and never shows admin items', () => {
    render(<Sidebar surface="staff" role={Role.STAFF} />);
    const home = screen.getByRole('link', { name: /home/i });
    expect(home).toHaveAttribute('aria-current', 'page'); // pathname = /home
    expect(screen.getByText('My Tasks')).toBeInTheDocument();
    expect(screen.queryByRole('link', { name: /users/i })).not.toBeInTheDocument();
    expect(screen.queryByRole('link', { name: /warehouses/i })).not.toBeInTheDocument();
  });

  it('renders a count badge on a staff task item', () => {
    render(<Sidebar surface="staff" role={Role.STAFF} />);
    const dispatch = screen.getByRole('link', { name: /dispatch stock/i });
    expect(dispatch).toHaveTextContent('5');
  });
});
