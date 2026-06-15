import { describe, it, expect } from 'vitest';
import '@testing-library/jest-dom/vitest';
import { render, screen } from '@testing-library/react';
import { ComingSoon } from './coming-soon';

describe('ComingSoon', () => {
  it('shows the feature name and phase', () => {
    render(<ComingSoon title="Inventory" phase={3} />);
    expect(screen.getByText('Inventory')).toBeInTheDocument();
    expect(screen.getByText(/Phase 3/i)).toBeInTheDocument();
  });
});
