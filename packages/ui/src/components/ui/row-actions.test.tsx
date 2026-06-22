import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { RowActions } from './row-actions';

describe('RowActions', () => {
  it('renders only the actions provided', () => {
    render(<RowActions onEdit={() => {}} />);
    expect(screen.getByLabelText('Edit')).toBeInTheDocument();
    expect(screen.queryByLabelText('Delete')).not.toBeInTheDocument();
    expect(screen.queryByLabelText('View')).not.toBeInTheDocument();
  });

  it('fires the delete handler', async () => {
    const onDelete = vi.fn();
    render(<RowActions onDelete={onDelete} />);
    await userEvent.click(screen.getByLabelText('Delete'));
    expect(onDelete).toHaveBeenCalledOnce();
  });
});
