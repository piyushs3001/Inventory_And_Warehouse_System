import { describe, it, expect, beforeEach, vi } from 'vitest';
import '@testing-library/jest-dom/vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import MockAdapter from 'axios-mock-adapter';
import { AXIOS_INSTANCE } from '@iws/api-client';
import { CategoryFormDialog } from './category-form-dialog';

let mock: MockAdapter;
beforeEach(() => { mock = new MockAdapter(AXIOS_INSTANCE); });

const PARENT = { id: 'c1', name: 'Beverages', parentId: null, createdAt: '' };
const CHILD = { id: 'c2', name: 'Sodas', parentId: 'c1', createdAt: '' };

const renderDialog = (props: Partial<Parameters<typeof CategoryFormDialog>[0]> = {}) =>
  render(
    <QueryClientProvider client={new QueryClient()}>
      <CategoryFormDialog
        categories={[PARENT, CHILD]}
        onClose={() => {}}
        onSuccess={async () => {}}
        {...props}
      />
    </QueryClientProvider>,
  );

describe('CategoryFormDialog', () => {
  it('excludes the category being edited from the parent options (no self-parent)', () => {
    renderDialog({ category: PARENT });
    const select = screen.getByLabelText('Parent category') as HTMLSelectElement;
    const optionValues = Array.from(select.options).map((o) => o.value);
    expect(optionValues).toContain('c2'); // other category available
    expect(optionValues).not.toContain('c1'); // itself excluded
  });

  it('creates a category via the API', async () => {
    const onSuccess = vi.fn(async () => {});
    mock.onPost('/categories').reply(201, { id: 'c3', name: 'Snacks', parentId: null, createdAt: '' });
    renderDialog({ onSuccess });

    await userEvent.type(screen.getByLabelText('Name'), 'Snacks');
    await userEvent.click(screen.getByRole('button', { name: /create/i }));

    await waitFor(() => expect(onSuccess).toHaveBeenCalled());
    expect(JSON.parse(mock.history.post[0].data as string)).toMatchObject({
      name: 'Snacks',
    });
  });
});
