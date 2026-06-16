import { describe, it, expect } from 'vitest';
import '@testing-library/jest-dom/vitest';
import { render, screen } from '@testing-library/react';
import { EntityAvatar } from './entity-avatar';

describe('EntityAvatar', () => {
  it('renders initials and is decorative (aria-hidden)', () => {
    render(<EntityAvatar name="Central Warehouse" />);
    const el = screen.getByText('CW');
    expect(el).toBeInTheDocument();
    expect(el).toHaveAttribute('aria-hidden');
  });
});
