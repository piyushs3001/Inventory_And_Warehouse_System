import { describe, it, expect, vi } from 'vitest';
import '@testing-library/jest-dom/vitest';
import { render, screen } from '@testing-library/react';

vi.mock('@/lib/auth/auth-context', () => ({
  useAuth: () => ({ user: { name: 'Jamal' } }),
}));

import HomePage from './page';

describe('HomePage', () => {
  it('greets the signed-in user and shows a coming-soon empty state (no fake numbers)', () => {
    render(<HomePage />);
    expect(screen.getByRole('heading', { name: /welcome, jamal/i })).toBeInTheDocument();
    expect(screen.getByText(/dashboard is coming soon/i)).toBeInTheDocument();
  });
});
