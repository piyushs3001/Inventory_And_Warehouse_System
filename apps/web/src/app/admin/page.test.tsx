import { describe, it, expect, vi } from 'vitest';
import '@testing-library/jest-dom/vitest';
import { render, screen } from '@testing-library/react';
import DashboardPage from './page';

vi.mock('@/lib/auth/auth-context', () => ({
  useAuth: () => ({ user: { name: 'Test Admin', role: 'SUPER_ADMIN' } }),
}));

describe('Admin Dashboard', () => {
  it('renders KPI cards from mock data', () => {
    render(<DashboardPage />);
    expect(screen.getByText('Inventory Value')).toBeInTheDocument();
    expect(screen.getByText('$4.82M')).toBeInTheDocument();
    expect(screen.getByRole('heading', { level: 1 })).toBeInTheDocument();
  });
});
