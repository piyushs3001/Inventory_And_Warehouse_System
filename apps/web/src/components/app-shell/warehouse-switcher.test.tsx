import { describe, it, expect, vi } from 'vitest';
import '@testing-library/jest-dom/vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { WarehouseSwitcher } from './warehouse-switcher';

vi.mock('@/lib/api/generated/warehouses/warehouses', () => ({
  useWarehousesControllerList: () => ({
    data: [
      { id: '1', name: 'West Coast Hub' },
      { id: '2', name: 'Midwest DC' },
    ],
    isLoading: false,
  }),
}));

describe('WarehouseSwitcher', () => {
  it('renders the eyebrow and first warehouse name', () => {
    render(<WarehouseSwitcher />);
    expect(screen.getByText('Warehouse')).toBeInTheDocument();
    expect(screen.getByText('West Coast Hub')).toBeInTheDocument();
  });

  it('cycles to the next warehouse on click', async () => {
    const user = userEvent.setup();
    render(<WarehouseSwitcher />);
    await user.click(screen.getByRole('button', { name: /switch warehouse/i }));
    expect(screen.getByText('Midwest DC')).toBeInTheDocument();
  });
});
