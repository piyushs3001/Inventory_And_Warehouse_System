import { describe, it, expect } from 'vitest';
import '@testing-library/jest-dom/vitest';
import { render, screen } from '@testing-library/react';
import { StatCard } from './stat-card';

describe('StatCard', () => {
  it('renders label and value', () => {
    render(<StatCard label="SKUs" value={612} />);
    expect(screen.getByText('SKUs')).toBeInTheDocument();
    expect(screen.getByText('612')).toBeInTheDocument();
  });
});
