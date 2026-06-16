import { describe, it, expect } from 'vitest';
import '@testing-library/jest-dom/vitest';
import { render, screen } from '@testing-library/react';
import { PageHead } from './page-head';

describe('PageHead', () => {
  it('renders heading with correct title', () => {
    render(<PageHead title="Warehouses" />);
    expect(screen.getByRole('heading', { name: 'Warehouses' })).toBeInTheDocument();
  });

  it('renders description when provided', () => {
    render(<PageHead title="Warehouses" description="Manage your warehouse locations" />);
    expect(screen.getByText('Manage your warehouse locations')).toBeInTheDocument();
  });

  it('renders action nodes when provided', () => {
    render(<PageHead title="Warehouses" actions={<button>Add Warehouse</button>} />);
    expect(screen.getByRole('button', { name: 'Add Warehouse' })).toBeInTheDocument();
  });
});
