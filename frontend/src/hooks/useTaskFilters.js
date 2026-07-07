import { useCallback, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';

/**
 * Task filters backed by the URL query string, so a filtered board/list is
 * shareable and survives refresh/back navigation (acceptance criterion).
 */
export const useTaskFilters = () => {
  const [searchParams, setSearchParams] = useSearchParams();

  const filters = useMemo(() => Object.fromEntries(searchParams.entries()), [searchParams]);

  /**
   * Apply several filter changes in a single URL update. This must be atomic:
   * `setSearchParams` closes over the current params, so multiple synchronous
   * calls each start from the same base and the last `navigate` wins — silently
   * dropping the earlier changes (e.g. selecting a due preset while also
   * clearing the custom range). Batching avoids that.
   */
  const setFilters = useCallback(
    (patch) => {
      setSearchParams(
        (prev) => {
          const next = new URLSearchParams(prev);
          let changedNonPage = false;
          Object.entries(patch).forEach(([key, value]) => {
            if (value === '' || value == null) next.delete(key);
            else next.set(key, value);
            if (key !== 'page') changedNonPage = true;
          });
          // Any filter change (other than paging itself) resets pagination.
          if (changedNonPage) next.delete('page');
          return next;
        },
        { replace: true },
      );
    },
    [setSearchParams],
  );

  const setFilter = useCallback((key, value) => setFilters({ [key]: value }), [setFilters]);

  const clear = useCallback(() => setSearchParams({}, { replace: true }), [setSearchParams]);

  const activeCount = ['status', 'priority', 'assigneeId', 'teamId', 'search', 'label', 'due'].filter(
    (k) => filters[k],
  ).length;

  return { filters, setFilter, setFilters, clear, activeCount };
};
