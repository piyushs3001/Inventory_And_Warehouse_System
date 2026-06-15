import { describe, it, expect } from 'vitest';
import '@testing-library/jest-dom/vitest';
import { render, screen } from '@testing-library/react';
import { KpiCard } from './kpi-card';

describe('KpiCard', () => {
  it('renders value and a positive delta', () => {
    render(<KpiCard label="Inventory Value" value="$4.82M" delta={{ dir: 'up', text: '+8.1% vs last mo' }} />);
    expect(screen.getByText('Inventory Value')).toBeInTheDocument();
    expect(screen.getByText('$4.82M')).toBeInTheDocument();
    expect(screen.getByText('+8.1% vs last mo')).toBeInTheDocument();
  });
});
