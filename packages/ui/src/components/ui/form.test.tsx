import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { FormField } from './form';

describe('FormField', () => {
  it('renders label and error', () => {
    render(
      <FormField label="Name" htmlFor="name" error="Required">
        <input id="name" />
      </FormField>,
    );
    expect(screen.getByText('Name')).toBeInTheDocument();
    expect(screen.getByRole('alert')).toHaveTextContent('Required');
  });

  it('shows helper text when there is no error', () => {
    render(
      <FormField label="SKU" helper="Unique per product">
        <input />
      </FormField>,
    );
    expect(screen.getByText('Unique per product')).toBeInTheDocument();
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });
});
