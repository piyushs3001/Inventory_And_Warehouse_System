import { describe, it, expect } from 'vitest';
import '@testing-library/jest-dom/vitest';
import { render } from '@testing-library/react';
import { BarChart } from './bar-chart';

describe('BarChart', () => {
  it('renders one rect per value', () => {
    const { container } = render(<BarChart values={[4, 8, 6, 10, 7, 9]} />);
    expect(container.querySelectorAll('svg rect').length).toBe(6);
  });
});
