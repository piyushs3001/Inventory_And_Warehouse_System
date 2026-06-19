import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import '@testing-library/jest-dom/vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import MockAdapter from 'axios-mock-adapter';
import { AXIOS_INSTANCE } from '@iws/api-client';
import CategoriesPage from './page';

let mock: MockAdapter;
beforeEach(() => { mock = new MockAdapter(AXIOS_INSTANCE); });
afterEach(() => { vi.restoreAllMocks(); });

const PARENT = { id: 'c1', name: 'Beverages', parentId: null, createdAt: '' };
const CHILD = { id: 'c2', name: 'Sodas', parentId: 'c1', createdAt: '' };

const renderPage = () =>
  render(
    <QueryClientProvider client={new QueryClient()}>
      <CategoriesPage />
    </QueryClientProvider>,
  );

describe('CategoriesPage', () => {
  it('renders categories and resolves the parent name', async () => {
    mock.onGet('/categories').reply(200, [PARENT, CHILD]);
    renderPage();
    await waitFor(() => expect(screen.getByText('Sodas')).toBeInTheDocument());
    // "Beverages" appears twice: as its own row name AND as the child's
    // resolved parent name — never the raw parent id.
    expect(screen.getAllByText('Beverages')).toHaveLength(2);
    expect(screen.queryByText('c1')).not.toBeInTheDocument();
  });

  it('surfaces the 409 message when deleting a category that has children', async () => {
    vi.spyOn(window, 'confirm').mockReturnValue(true);
    mock.onGet('/categories').reply(200, [PARENT, CHILD]);
    mock
      .onDelete('/categories/c1')
      .reply(409, { message: 'Category has child categories' });
    renderPage();
    await waitFor(() => expect(screen.getByText('Sodas')).toBeInTheDocument());

    const deleteButtons = screen.getAllByRole('button', { name: /delete/i });
    await userEvent.click(deleteButtons[0]);

    await waitFor(() =>
      expect(screen.getByRole('alert')).toHaveTextContent(
        'Category has child categories',
      ),
    );
  });
});
