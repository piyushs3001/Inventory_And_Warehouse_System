import { describe, it, expect, vi } from 'vitest';
import '@testing-library/jest-dom/vitest';
import { render, screen } from '@testing-library/react';
import HomePage from './page';

vi.mock('@/lib/auth/auth-context', () => ({
  useAuth: () => ({ user: { name: 'Test Staff', role: 'STAFF' } }),
}));

describe('Staff Home', () => {
  it('renders quick actions and tasks', () => {
    render(<HomePage />);
    expect(screen.getByRole('link', { name: /Receive Stock/i })).toBeInTheDocument();
    expect(screen.getByText('Receive PO-2842')).toBeInTheDocument();
  });
  it('has a single h1 page heading', () => {
    render(<HomePage />);
    expect(screen.getByRole('heading', { level: 1 })).toBeInTheDocument();
  });
});
