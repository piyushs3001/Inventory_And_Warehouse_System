import { describe, it, expect, vi } from 'vitest';
import '@testing-library/jest-dom/vitest';
import { render, screen } from '@testing-library/react';

vi.mock('next/navigation', () => ({ usePathname: () => '/admin/users' }));
vi.mock('next-themes', () => ({ useTheme: () => ({ resolvedTheme: 'light', setTheme: vi.fn() }) }));

import { Topbar } from './topbar';

describe('Topbar', () => {
  it('renders the surface + page breadcrumb and the theme toggle', () => {
    render(<Topbar surface="admin" />);
    expect(screen.getByText('Admin Portal')).toBeInTheDocument();
    expect(screen.getByText('Users')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /dark mode/i })).toBeInTheDocument();
  });
});
