import { describe, it, expect } from 'vitest';
import '@testing-library/jest-dom/vitest';
import { render, screen } from '@testing-library/react';
import { ProgressBar } from './progress-bar';

describe('ProgressBar', () => {
  it('exposes value via role=progressbar', () => {
    render(<ProgressBar value={92} label="Aisle A" />);
    const bar = screen.getByRole('progressbar');
    expect(bar).toHaveAttribute('aria-valuenow', '92');
  });

  it('uses the danger tone at/above 90%', () => {
    const { container } = render(<ProgressBar value={95} />);
    expect(container.querySelector('.bg-destructive')).toBeTruthy();
  });
});
