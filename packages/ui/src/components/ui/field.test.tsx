import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { Field } from './field';

describe('Field', () => {
  it('renders the label and value', () => {
    render(<Field label="SKU">ABC-123</Field>);
    expect(screen.getByText('SKU')).toBeInTheDocument();
    expect(screen.getByText('ABC-123')).toBeInTheDocument();
  });
});
