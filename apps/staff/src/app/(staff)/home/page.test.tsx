import { describe, it, expect, vi } from 'vitest';
import '@testing-library/jest-dom/vitest';
import { render, screen } from '@testing-library/react';

vi.mock('@iws/auth', () => ({
  useAuth: () => ({ user: { name: 'Test Staff', role: 'STAFF' } }),
}));

vi.mock('@iws/api-client', () => ({
  useDashboardControllerGet: () => ({
    isLoading: false,
    data: {
      totalProducts: 5,
      totalStockUnits: 120,
      stockValue: '300.00',
      lowStockCount: 1,
      pendingPurchaseOrders: 0,
      pendingTransfers: 2,
      recentMovements: [],
      topProducts: [],
    },
  }),
}));

import HomePage from './page';

describe('Staff Home', () => {
  it('renders quick actions and live KPIs', () => {
    render(<HomePage />);
    expect(screen.getByRole('link', { name: /Receive Stock/i })).toBeInTheDocument();
    expect(screen.getByText('Stock units')).toBeInTheDocument();
    expect(screen.getByText('Pending transfers')).toBeInTheDocument();
  });
  it('has a single h1 page heading', () => {
    render(<HomePage />);
    expect(screen.getByRole('heading', { level: 1 })).toBeInTheDocument();
  });
});
