import { describe, it, expect } from 'vitest';
import '@testing-library/jest-dom/vitest';
import { render, screen } from '@testing-library/react';
import { StepperTimeline } from './stepper-timeline';

describe('StepperTimeline', () => {
  it('marks the active step with aria-current', () => {
    render(<StepperTimeline steps={['Requested', 'Approved', 'In Transit', 'Received']} activeIndex={2} />);
    expect(screen.getByText('In Transit').closest('li')).toHaveAttribute('aria-current', 'step');
  });

  it('shows a check (not the number) for completed steps', () => {
    render(<StepperTimeline steps={['Requested', 'Approved', 'In Transit', 'Received']} activeIndex={2} />);
    // steps 0 and 1 are done → render Check icons, not numbers; assert their numbers absent
    expect(screen.queryByText('1')).not.toBeInTheDocument();
    expect(screen.queryByText('2')).not.toBeInTheDocument();
    // active step (index 2) renders number 3; pending step (index 3) renders number 4
    expect(screen.getByText('3')).toBeInTheDocument();
    expect(screen.getByText('4')).toBeInTheDocument();
  });
});
