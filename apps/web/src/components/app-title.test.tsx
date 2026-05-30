import { describe, it, expect } from 'vitest';
import '@testing-library/jest-dom/vitest';
import { render, screen } from '@testing-library/react';
import { AppTitle } from './app-title';

describe('AppTitle', () => {
  it('renders the system name as a heading', () => {
    render(<AppTitle />);
    expect(
      screen.getByRole('heading', { name: /inventory & warehouse system/i }),
    ).toBeInTheDocument();
  });
});
