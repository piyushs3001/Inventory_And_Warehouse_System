import { describe, it, expect } from 'vitest';
import '@testing-library/jest-dom/vitest';
import { render, screen } from '@testing-library/react';
import { StatusBadge } from './status-badge';

describe('StatusBadge', () => {
  it('renders the label', () => {
    render(<StatusBadge tone="ok">Active</StatusBadge>);
    expect(screen.getByText('Active')).toBeInTheDocument();
  });
  it('applies tone classes', () => {
    render(<StatusBadge tone="warn">Below reorder</StatusBadge>);
    expect(screen.getByText('Below reorder')).toHaveClass('text-warn-ink');
  });
});
