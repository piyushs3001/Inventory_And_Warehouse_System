import { describe, it, expect, vi, beforeEach } from 'vitest';
import '@testing-library/jest-dom/vitest';
import { render, screen, fireEvent } from '@testing-library/react';

const setTheme = vi.fn();
let resolvedTheme = 'light';
vi.mock('next-themes', () => ({
  useTheme: () => ({ resolvedTheme, setTheme }),
}));

import { ThemeToggle } from './theme-toggle';

describe('ThemeToggle', () => {
  beforeEach(() => {
    setTheme.mockClear();
    resolvedTheme = 'light';
  });

  it('renders a non-submitting button with a dark-mode aria-label in light mode', () => {
    render(<ThemeToggle />);
    const btn = screen.getByRole('button', { name: /dark mode/i });
    expect(btn).toHaveAttribute('type', 'button');
  });

  it('switches to dark when clicked while in light mode', () => {
    render(<ThemeToggle />);
    fireEvent.click(screen.getByRole('button', { name: /dark mode/i }));
    expect(setTheme).toHaveBeenCalledWith('dark');
  });

  it('switches to light when clicked while in dark mode', () => {
    resolvedTheme = 'dark';
    render(<ThemeToggle />);
    fireEvent.click(screen.getByRole('button', { name: /light mode/i }));
    expect(setTheme).toHaveBeenCalledWith('light');
  });
});
