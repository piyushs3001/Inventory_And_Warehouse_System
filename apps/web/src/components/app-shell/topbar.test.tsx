import { describe, it, expect, vi } from 'vitest';
import '@testing-library/jest-dom/vitest';
import { render, screen } from '@testing-library/react';

// ThemeToggle reads resolvedTheme; no usePathname needed in the new Topbar
vi.mock('next-themes', () => ({ useTheme: () => ({ resolvedTheme: 'light', setTheme: vi.fn() }) }));

// WarehouseSwitcher calls this hook — mock it so no real QueryClient is needed
vi.mock('@/lib/api/generated/warehouses/warehouses', () => ({
  useWarehousesControllerList: () => ({
    data: [{ id: '1', name: 'West Coast Hub' }],
    isLoading: false,
  }),
}));

import { Topbar } from './topbar';

describe('Topbar', () => {
  it('renders the search input and theme toggle on admin surface', () => {
    render(<Topbar surface="admin" />);
    expect(screen.getByRole('searchbox', { name: /search/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /dark mode/i })).toBeInTheDocument();
  });

  it('shows Ask AI button and warehouse switcher on the admin surface', () => {
    render(<Topbar surface="admin" />);
    expect(screen.getByRole('button', { name: /ask ai/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /switch warehouse/i })).toBeInTheDocument();
  });

  it('hides Ask AI and warehouse switcher on the staff surface', () => {
    render(<Topbar surface="staff" />);
    expect(screen.queryByRole('button', { name: /ask ai/i })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /switch warehouse/i })).not.toBeInTheDocument();
  });

  it('shows the notifications bell on both surfaces', () => {
    const { rerender } = render(<Topbar surface="admin" />);
    expect(screen.getByRole('button', { name: /notifications/i })).toBeInTheDocument();
    rerender(<Topbar surface="staff" />);
    expect(screen.getByRole('button', { name: /notifications/i })).toBeInTheDocument();
  });
});
