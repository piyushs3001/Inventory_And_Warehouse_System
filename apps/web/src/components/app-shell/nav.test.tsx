import { describe, it, expect, vi } from 'vitest';
import '@testing-library/jest-dom/vitest';
import { render, screen } from '@testing-library/react';
import { Nav } from './nav';

vi.mock('next/navigation', () => ({ usePathname: () => '/admin/users' }));

describe('Nav', () => {
  it('shows Users for a Super Admin, linking to the /admin-prefixed route', () => {
    render(<Nav role="SUPER_ADMIN" />);
    const link = screen.getByRole('link', { name: /users/i });
    expect(link).toBeInTheDocument();
    expect(link).toHaveAttribute('href', '/admin/users');
  });

  it('hides Users for Staff', () => {
    render(<Nav role="STAFF" />);
    expect(screen.queryByRole('link', { name: /users/i })).not.toBeInTheDocument();
  });

  it('shows Warehouses link for Super Admin', () => {
    render(<Nav role="SUPER_ADMIN" />);
    const link = screen.getByRole('link', { name: /warehouses/i });
    expect(link).toBeInTheDocument();
    expect(link).toHaveAttribute('href', '/admin/warehouses');
  });

  it('hides Warehouses link for Staff', () => {
    render(<Nav role="STAFF" />);
    expect(screen.queryByRole('link', { name: /warehouses/i })).not.toBeInTheDocument();
  });
});
