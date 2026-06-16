import { describe, it, expect } from 'vitest';
import '@testing-library/jest-dom/vitest';
import { render, screen } from '@testing-library/react';
import { Truck } from 'lucide-react';
import { QuickActionCard } from './quick-action-card';

describe('QuickActionCard', () => {
  it('renders as a link to the given href', () => {
    render(<QuickActionCard icon={<Truck />} tone="transit" label="Receive Stock" description="Log incoming" href="/receive" />);
    const link = screen.getByRole('link', { name: /Receive Stock/i });
    expect(link).toHaveAttribute('href', '/receive');
  });
});
