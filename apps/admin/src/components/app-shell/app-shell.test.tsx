import { describe, it, expect, vi } from 'vitest';
import '@testing-library/jest-dom/vitest';
import { render, screen } from '@testing-library/react';

vi.mock('@iws/auth', () => ({ useAuth: () => ({ user: { name: 'Admin', role: 'SUPER_ADMIN' }, logout: vi.fn() }) }));
vi.mock('next/navigation', () => ({ usePathname: () => '/admin/users', useRouter: () => ({ replace: vi.fn() }) }));
vi.mock('next-themes', () => ({ useTheme: () => ({ resolvedTheme: 'light', setTheme: vi.fn() }) }));
// WarehouseSwitcher (rendered via Topbar on admin surface) calls this hook.
// Keep the real module (Role enum, etc.) and override only the hook.
vi.mock('@iws/api-client', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@iws/api-client')>()),
  useWarehousesControllerList: () => ({ data: [{ id: '1', name: 'West Coast Hub' }], isLoading: false }),
}));

import { AppShell } from './app-shell';

describe('AppShell', () => {
  it('renders sidebar nav, topbar, and children', () => {
    render(<AppShell surface="admin"><p>page-body</p></AppShell>);
    expect(screen.getByText('page-body')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /warehouses/i })).toBeInTheDocument(); // sidebar
    expect(screen.getByText('Admin Portal')).toBeInTheDocument(); // sidebar brand sub-label (breadcrumb uses short "Admin")
  });
});
