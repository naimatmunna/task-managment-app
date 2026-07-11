import { useState, useMemo } from 'react';

/**
 * In-memory pagination for lists already fully loaded on the client (small,
 * bounded collections like members/teams). For large/unbounded data prefer
 * server-side paging (see TasksList) so the client never holds the whole set.
 *
 * Returns the current page slice plus the props the shared <Pagination/> needs.
 * The page auto-clamps when the underlying list shrinks (e.g. after filtering).
 */
export function useClientPagination(items = [], initialSize = 10) {
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(initialSize);

  const total = items.length;
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const safePage = Math.min(page, totalPages);

  const pageItems = useMemo(
    () => items.slice((safePage - 1) * pageSize, safePage * pageSize),
    [items, safePage, pageSize],
  );

  return {
    page: safePage,
    pageSize,
    total,
    totalPages,
    pageItems,
    setPage,
    setPageSize: (n) => {
      setPageSize(n);
      setPage(1);
    },
  };
}
