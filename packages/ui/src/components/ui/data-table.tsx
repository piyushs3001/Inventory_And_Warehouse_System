'use client';

import { useMemo, useState, type ReactNode } from 'react';
import { cn } from '../../utils';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from './table';
import { Button } from './button';
import { Input } from './input';
import { Skeleton } from './skeleton';
import { EmptyState } from './empty-state';

export type DataTableColumn<T> = {
  /** Stable key for the column. */
  key: string;
  header: ReactNode;
  /** Renders the cell for a row. */
  cell: (row: T) => ReactNode;
  /** Extra classes applied to both the header and body cells. */
  className?: string;
  align?: 'left' | 'right';
  /** Provide to make the column sortable (click the header to toggle). */
  sortValue?: (row: T) => string | number;
};

/**
 * Column-driven table with a search box, optional per-column sorting, and
 * client-side pagination. The list endpoints return full arrays, so paging is
 * done in-memory here — one consistent table UX across every screen.
 */
export function DataTable<T>({
  columns,
  rows,
  getRowKey,
  isLoading = false,
  pageSize = 10,
  searchPlaceholder,
  searchFilter,
  empty,
  toolbar,
}: {
  columns: DataTableColumn<T>[];
  rows: T[];
  getRowKey: (row: T) => string;
  isLoading?: boolean;
  pageSize?: number;
  /** When set, a search box is shown (pair with `searchFilter`). */
  searchPlaceholder?: string;
  searchFilter?: (row: T, query: string) => boolean;
  /** Empty-state node (defaults to a generic EmptyState). */
  empty?: ReactNode;
  /** Extra controls (filters, toggles) rendered beside the search box. */
  toolbar?: ReactNode;
}) {
  const [query, setQuery] = useState('');
  const [page, setPage] = useState(0);
  const [sort, setSort] = useState<{ key: string; dir: 'asc' | 'desc' } | null>(
    null,
  );

  const filtered = useMemo(() => {
    let result = rows;
    const q = query.trim().toLowerCase();
    if (q && searchFilter) result = result.filter((row) => searchFilter(row, q));
    if (sort) {
      const col = columns.find((c) => c.key === sort.key);
      if (col?.sortValue) {
        result = [...result].sort((a, b) => {
          const av = col.sortValue!(a);
          const bv = col.sortValue!(b);
          const cmp = av < bv ? -1 : av > bv ? 1 : 0;
          return sort.dir === 'asc' ? cmp : -cmp;
        });
      }
    }
    return result;
  }, [rows, query, sort, columns, searchFilter]);

  const pageCount = Math.max(1, Math.ceil(filtered.length / pageSize));
  const current = Math.min(page, pageCount - 1);
  const pageRows = filtered.slice(current * pageSize, current * pageSize + pageSize);

  const toggleSort = (key: string): void => {
    setSort((s) =>
      s?.key === key
        ? { key, dir: s.dir === 'asc' ? 'desc' : 'asc' }
        : { key, dir: 'asc' },
    );
  };

  const hasToolbar = Boolean(searchPlaceholder) || Boolean(toolbar);

  return (
    <div className="flex flex-col gap-3">
      {hasToolbar && (
        <div className="flex flex-wrap items-center gap-3">
          {searchPlaceholder && (
            <Input
              aria-label="Search"
              placeholder={searchPlaceholder}
              value={query}
              onChange={(e) => {
                setQuery(e.target.value);
                setPage(0);
              }}
              className="max-w-xs"
            />
          )}
          {toolbar}
        </div>
      )}

      {isLoading ? (
        <div className="flex flex-col gap-2">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-12 w-full" />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        empty ?? (
          <EmptyState
            title={query ? 'No matches' : 'Nothing here yet'}
            description={
              query
                ? 'No rows match the current search.'
                : 'There is nothing to show.'
            }
          />
        )
      ) : (
        <div className="overflow-hidden rounded-xl bg-card ring-1 ring-foreground/10">
          <Table>
            <TableHeader>
              <TableRow>
                {columns.map((c) => (
                  <TableHead
                    key={c.key}
                    className={cn(
                      c.align === 'right' && 'text-right',
                      c.sortValue && 'cursor-pointer select-none',
                      c.className,
                    )}
                    aria-sort={
                      sort?.key === c.key
                        ? sort.dir === 'asc'
                          ? 'ascending'
                          : 'descending'
                        : undefined
                    }
                    onClick={c.sortValue ? () => toggleSort(c.key) : undefined}
                  >
                    {c.header}
                    {c.sortValue && sort?.key === c.key
                      ? sort.dir === 'asc'
                        ? ' ▲'
                        : ' ▼'
                      : ''}
                  </TableHead>
                ))}
              </TableRow>
            </TableHeader>
            <TableBody>
              {pageRows.map((row) => (
                <TableRow key={getRowKey(row)}>
                  {columns.map((c) => (
                    <TableCell
                      key={c.key}
                      className={cn(c.align === 'right' && 'text-right', c.className)}
                    >
                      {c.cell(row)}
                    </TableCell>
                  ))}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      {filtered.length > pageSize && (
        <div className="flex items-center justify-between text-sm text-muted-foreground">
          <span>{filtered.length} total</span>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              disabled={current === 0}
              onClick={() => setPage(current - 1)}
            >
              Prev
            </Button>
            <span>
              Page {current + 1} of {pageCount}
            </span>
            <Button
              variant="outline"
              size="sm"
              disabled={current >= pageCount - 1}
              onClick={() => setPage(current + 1)}
            >
              Next
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
