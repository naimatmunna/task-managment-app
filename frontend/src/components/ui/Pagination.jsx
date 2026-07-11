import { ChevronLeft, ChevronRight } from 'lucide-react';
import { cn } from '@/lib/classNames.js';

/** Compact page window with ellipses: 1 … 4 [5] 6 … 20 */
function pageWindow(page, totalPages) {
  if (totalPages <= 7) return Array.from({ length: totalPages }, (_, i) => i + 1);
  const out = [1];
  const start = Math.max(2, page - 1);
  const end = Math.min(totalPages - 1, page + 1);
  if (start > 2) out.push('…');
  for (let p = start; p <= end; p += 1) out.push(p);
  if (end < totalPages - 1) out.push('…');
  out.push(totalPages);
  return out;
}

/**
 * Shared pagination bar. Works for server-side (pass the API's page/total) and
 * client-side (slice locally) lists alike. Renders a range summary, an optional
 * rows-per-page selector, and prev / numbered / next controls.
 */
export default function Pagination({
  page,
  pageSize = 25,
  total = 0,
  totalPages: totalPagesProp,
  onChange,
  onPageSizeChange,
  pageSizeOptions = [10, 25, 50, 100],
  label = 'items',
  className,
}) {
  const totalPages = totalPagesProp ?? Math.max(1, Math.ceil(total / pageSize));
  if (totalPages <= 1 && !onPageSizeChange) return null;

  const from = total === 0 ? 0 : (page - 1) * pageSize + 1;
  const to = Math.min(total, page * pageSize);
  const go = (p) => p >= 1 && p <= totalPages && p !== page && onChange?.(p);

  const btn =
    'flex h-8 min-w-8 items-center justify-center rounded-lg border border-gray-200 px-2 text-sm text-gray-600 transition hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-40 dark:border-white/10 dark:text-gray-300 dark:hover:bg-gray-800';

  return (
    <div className={cn('mt-4 flex flex-wrap items-center justify-between gap-3', className)}>
      <div className="flex items-center gap-3 text-sm text-gray-500 dark:text-gray-400">
        <span className="tabular-nums">
          {total > 0 ? (
            <>
              Showing <span className="font-medium text-gray-700 dark:text-gray-200">{from}–{to}</span> of{' '}
              <span className="font-medium text-gray-700 dark:text-gray-200">{total}</span> {label}
            </>
          ) : (
            `No ${label}`
          )}
        </span>
        {onPageSizeChange && (
          <label className="flex items-center gap-1.5">
            <span className="hidden sm:inline">Rows</span>
            <select
              value={pageSize}
              onChange={(e) => onPageSizeChange(Number(e.target.value))}
              className="h-8 rounded-lg border border-gray-200 bg-white px-2 text-sm text-gray-700 focus:border-brand-500 focus:outline-none dark:border-white/10 dark:bg-gray-800 dark:text-gray-200"
            >
              {pageSizeOptions.map((n) => (
                <option key={n} value={n}>{n}</option>
              ))}
            </select>
          </label>
        )}
      </div>

      {totalPages > 1 && (
        <div className="flex items-center gap-1">
          <button className={btn} disabled={page <= 1} onClick={() => go(page - 1)} aria-label="Previous page">
            <ChevronLeft className="h-4 w-4" />
          </button>
          {pageWindow(page, totalPages).map((p, i) =>
            p === '…' ? (
              <span key={`e${i}`} className="px-1 text-gray-400">…</span>
            ) : (
              <button
                key={p}
                onClick={() => go(p)}
                aria-current={p === page ? 'page' : undefined}
                className={cn(
                  btn,
                  p === page && 'border-brand-500 bg-brand-600 text-white hover:bg-brand-600 dark:border-brand-500',
                )}
              >
                {p}
              </button>
            ),
          )}
          <button className={btn} disabled={page >= totalPages} onClick={() => go(page + 1)} aria-label="Next page">
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>
      )}
    </div>
  );
}
