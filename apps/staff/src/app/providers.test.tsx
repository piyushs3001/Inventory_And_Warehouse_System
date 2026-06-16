import { describe, it, expect } from 'vitest';
import '@testing-library/jest-dom/vitest';
import { render, screen } from '@testing-library/react';
import { Providers } from './providers';

describe('Providers', () => {
  it('renders its children', () => {
    render(
      <Providers>
        <span>child-content</span>
      </Providers>,
    );
    expect(screen.getByText('child-content')).toBeInTheDocument();
  });
});
