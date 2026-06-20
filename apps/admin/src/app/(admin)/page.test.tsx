import { describe, it, expect, vi } from 'vitest';
import '@testing-library/jest-dom/vitest';
import { render, screen } from '@testing-library/react';

vi.mock('@iws/auth', () => ({
  useAuth: () => ({ user: { name: 'Test Admin', role: 'SUPER_ADMIN' } }),
}));

vi.mock('@iws/api-client', () => ({
  useDashboardControllerGet: () => ({
    isLoading: false,
    data: {
      totalProducts: 12,
      totalStockUnits: 340,
      stockValue: '1234.50',
      lowStockCount: 3,
      pendingPurchaseOrders: 2,
      pendingTransfers: 1,
      recentMovements: [
        { id: 'm1', type: 'RECEIVE', productName: 'Cola', sku: 'COLA-330', warehouseName: 'Central', afterQty: 100, createdAt: new Date().toISOString() },
      ],
      topProducts: [
        { productId: 'p1', name: 'Cola', sku: 'COLA-330', units: 100, value: '45.00' },
      ],
    },
  }),
}));

import DashboardPage from './page';

describe('Admin Dashboard', () => {
  it('renders live KPI cards from the dashboard endpoint', () => {
    render(<DashboardPage />);
    expect(screen.getByText('Stock value')).toBeInTheDocument();
    expect(screen.getByText('$1234.50')).toBeInTheDocument();
    expect(screen.getByText('Top products by value')).toBeInTheDocument();
    expect(screen.getByRole('heading', { level: 1 })).toBeInTheDocument();
  });
});
