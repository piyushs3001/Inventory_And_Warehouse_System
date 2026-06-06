import { describe, it, expect, vi } from 'vitest';
import '@testing-library/jest-dom/vitest';
import { render, screen } from '@testing-library/react';
import { Nav } from './nav';

vi.mock('next/navigation', () => ({ usePathname: () => '/users' }));

describe('Nav', () => {
  it('shows Users for a Super Admin', () => {
    render(<Nav role="SUPER_ADMIN" />);
    expect(screen.getByRole('link', { name: /users/i })).toBeInTheDocument();
  });

  it('hides Users for Staff', () => {
    render(<Nav role="STAFF" />);
    expect(screen.queryByRole('link', { name: /users/i })).not.toBeInTheDocument();
  });
});
