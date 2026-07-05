import { useCallback, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';

/**
 * Task filters backed by the URL query string, so a filtered board/list is
 * shareable and survives refresh/back navigation (acceptance criterion).
 */
export const useTaskFilters = () => {
  const [searchParams, setSearchParams] = useSearchParams();

  const filters = useMemo(() => Object.fromEntries(searchParams.entries()), [searchParams]);

  const setFilter = useCallback(
    (key, value) => {
      setSearchParams(
        (prev) => {
          const next = new URLSearchParams(prev);
          if (value === '' || value == null) next.delete(key);
          else next.set(key, value);
          // Any filter change resets pagination.
          if (key !== 'page') next.delete('page');
          return next;
        },
        { replace: true },
      );
    },
    [setSearchParams],
  );

  const clear = useCallback(() => setSearchParams({}, { replace: true }), [setSearchParams]);

  const activeCount = ['status', 'priority', 'assigneeId', 'teamId', 'search', 'label', 'due'].filter(
    (k) => filters[k],
  ).length;

  return { filters, setFilter, clear, activeCount };
};
