import { describe, it, expect, vi } from 'vitest';
import '@testing-library/jest-dom/vitest';
import { render, screen } from '@testing-library/react';

vi.mock('@iws/auth', () => ({ useAuth: () => ({ user: { name: 'Sam', role: 'STAFF' }, logout: vi.fn() }) }));
vi.mock('next/navigation', () => ({ usePathname: () => '/home', useRouter: () => ({ replace: vi.fn() }) }));
vi.mock('next-themes', () => ({ useTheme: () => ({ resolvedTheme: 'light', setTheme: vi.fn() }) }));
// Keep the real module (Role enum, etc.) and override only the hook the shell calls.
vi.mock('@iws/api-client', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@iws/api-client')>()),
  useWarehousesControllerList: () => ({ data: [{ id: '1', name: 'West Coast Hub' }], isLoading: false }),
}));

import { AppShell } from './app-shell';

describe('AppShell (staff)', () => {
  it('renders the staff sidebar nav, topbar, and children', () => {
    render(<AppShell surface="staff"><p>page-body</p></AppShell>);
    expect(screen.getByText('page-body')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /home/i })).toBeInTheDocument(); // sidebar
    expect(screen.getByText('Staff App')).toBeInTheDocument(); // sidebar brand sub-label
  });
});
