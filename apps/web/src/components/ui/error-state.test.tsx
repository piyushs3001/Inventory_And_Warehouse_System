import { describe, it, expect } from 'vitest';
import '@testing-library/jest-dom/vitest';
import { render, screen } from '@testing-library/react';
import { ErrorState } from './error-state';

describe('ErrorState', () => {
  it('renders the default title', () => {
    render(<ErrorState />);
    expect(screen.getByText('Something went wrong')).toBeInTheDocument();
  });

  it('renders a custom title', () => {
    render(<ErrorState title="Failed to load data" />);
    expect(screen.getByText('Failed to load data')).toBeInTheDocument();
  });
});
