import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { Section } from './section';

describe('Section', () => {
  it('renders children', () => {
    render(<Section>body</Section>);
    expect(screen.getByText('body')).toBeInTheDocument();
  });

  it('renders an optional title as a heading', () => {
    render(<Section title="Details">body</Section>);
    expect(screen.getByRole('heading', { name: 'Details' })).toBeInTheDocument();
  });
});
