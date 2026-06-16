import { describe, it, expect } from 'vitest';
import '@testing-library/jest-dom/vitest';
import { render } from '@testing-library/react';
import { AreaChart } from './area-chart';

describe('AreaChart', () => {
  it('renders both the gradient-filled area path and the stroked line path', () => {
    const { container } = render(<AreaChart data={[3.9, 4.1, 4.0, 4.35, 4.6, 4.82]} />);
    expect(container.querySelectorAll('svg path').length).toBe(2);
  });
});
