import { useCallback, useEffect, useId, useLayoutEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { format, startOfDay } from 'date-fns';
import { CalendarDays, X } from 'lucide-react';
import Calendar, { parseYmd, toYmd } from '@/components/ui/Calendar.jsx';
import { cn } from '@/lib/classNames.js';

const POPOVER_W = 300;
const MARGIN = 8;

const SIZES = {
  md: 'h-10 rounded-xl px-3.5 text-sm',
  sm: 'h-9 rounded-lg px-3 text-sm',
};

/**
 * A smooth, professional single-date picker.
 *
 * Drop-in for `<input type="date">`: `value` is a `yyyy-MM-dd` string (or '') and
 * `onChange` is called with the same shape ('' when cleared). Renders through a
 * portal so it is never clipped by a modal or scroll container, flips/clamps to
 * stay on screen, and works down to phone widths.
 */
export default function DatePicker({
  value,
  onChange,
  min,
  max,
  label,
  placeholder = 'Select date',
  displayFormat = 'MMM d, yyyy',
  size = 'md',
  align = 'start',
  clearable = true,
  disabled = false,
  error,
  className,
  id,
  weekStartsOn = 0,
  'aria-label': ariaLabel,
}) {
  const reactId = useId();
  const fieldId = id || reactId;
  const [open, setOpen] = useState(false);
  const [coords, setCoords] = useState(null);
  const triggerRef = useRef(null);
  const popRef = useRef(null);

  const selectedDate = parseYmd(value);

  const computeCoords = useCallback(() => {
    const el = triggerRef.current;
    if (!el) return null;
    const r = el.getBoundingClientRect();
    const width = Math.min(POPOVER_W, window.innerWidth - MARGIN * 2);
    const popH = popRef.current?.offsetHeight || 340;

    let left = align === 'end' ? r.right - width : r.left;
    left = Math.max(MARGIN, Math.min(left, window.innerWidth - width - MARGIN));

    const spaceBelow = window.innerHeight - r.bottom;
    const openUp = spaceBelow < popH + MARGIN && r.top > spaceBelow;
    let top = openUp ? r.top - MARGIN - popH : r.bottom + MARGIN;
    top = Math.max(MARGIN, Math.min(top, window.innerHeight - popH - MARGIN));

    return { top, left, width };
  }, [align]);

  const openPicker = () => {
    if (disabled) return;
    setCoords(computeCoords());
    setOpen(true);
  };

  // Refine position once the popover has real dimensions, and keep it anchored
  // while scrolling/resizing.
  useLayoutEffect(() => {
    if (!open) return undefined;
    const reposition = () => setCoords(computeCoords());
    reposition();
    window.addEventListener('scroll', reposition, true);
    window.addEventListener('resize', reposition);
    return () => {
      window.removeEventListener('scroll', reposition, true);
      window.removeEventListener('resize', reposition);
    };
  }, [open, computeCoords]);

  // Close on outside click / Escape.
  useEffect(() => {
    if (!open) return undefined;
    const onDown = (e) => {
      if (triggerRef.current?.contains(e.target) || popRef.current?.contains(e.target)) return;
      setOpen(false);
    };
    const onKey = (e) => {
      if (e.key === 'Escape') {
        setOpen(false);
        triggerRef.current?.focus();
      }
    };
    document.addEventListener('mousedown', onDown);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDown);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  const commit = (date) => {
    onChange?.(toYmd(date));
    setOpen(false);
    triggerRef.current?.focus();
  };

  const clear = (e) => {
    e.stopPropagation();
    onChange?.('');
  };

  const today = startOfDay(new Date());
  const todayDisabled =
    (min && startOfDay(parseYmd(min)) > today) || (max && startOfDay(parseYmd(max)) < today);

  return (
    <div className={cn('w-full', className)}>
      {label && (
        <label
          htmlFor={fieldId}
          className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-300"
        >
          {label}
        </label>
      )}
      <div className="relative">
        <button
          type="button"
          id={fieldId}
          ref={triggerRef}
          onClick={() => (open ? setOpen(false) : openPicker())}
          onKeyDown={(e) => {
            if (e.key === 'ArrowDown' && !open) {
              e.preventDefault();
              openPicker();
            }
          }}
          disabled={disabled}
          aria-haspopup="dialog"
          aria-expanded={open}
          aria-label={ariaLabel}
          className={cn(
            'inline-flex w-full items-center gap-2 border bg-white text-left shadow-xs transition-colors duration-150',
            'focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500',
            'disabled:cursor-not-allowed disabled:opacity-60',
            'dark:bg-gray-800/80 dark:text-gray-100',
            SIZES[size] || SIZES.md,
            clearable && selectedDate && !disabled && 'pr-9',
            error ? 'border-danger-400' : 'border-gray-200 dark:border-white/10',
            open && !error && 'border-brand-500 ring-1 ring-brand-500',
          )}
        >
          <CalendarDays className="h-4 w-4 shrink-0 text-gray-400" />
          <span className={cn('flex-1 truncate', !selectedDate && 'text-gray-400')}>
            {selectedDate ? format(selectedDate, displayFormat) : placeholder}
          </span>
        </button>
        {clearable && selectedDate && !disabled && (
          <button
            type="button"
            onClick={clear}
            aria-label="Clear date"
            className="absolute right-2 top-1/2 -translate-y-1/2 rounded-md p-0.5 text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-700 dark:hover:bg-gray-700 dark:hover:text-gray-200"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        )}
      </div>
      {error && <p className="mt-1.5 text-sm text-danger-600">{error}</p>}

      {createPortal(
        <AnimatePresence>
          {open && coords && (
            <motion.div
              ref={popRef}
              role="dialog"
              aria-modal="false"
              aria-label="Choose a date"
              style={{ position: 'fixed', top: coords.top, left: coords.left, width: coords.width }}
              className="z-[60] rounded-2xl border border-gray-200/80 bg-white p-3 shadow-pop dark:border-white/10 dark:bg-gray-900"
              initial={{ opacity: 0, scale: 0.96, y: -4 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.97, y: -4 }}
              transition={{ type: 'spring', stiffness: 420, damping: 30 }}
            >
              <Calendar
                selected={value}
                onSelect={commit}
                min={min}
                max={max}
                weekStartsOn={weekStartsOn}
              />
              <div className="mt-2 flex items-center justify-between border-t border-gray-100 pt-2 dark:border-white/10">
                <button
                  type="button"
                  disabled={todayDisabled}
                  onClick={() => commit(today)}
                  className="rounded-lg px-2 py-1 text-xs font-semibold text-brand-600 transition-colors hover:bg-brand-50 disabled:opacity-40 dark:text-brand-300 dark:hover:bg-brand-500/10"
                >
                  Today
                </button>
                {selectedDate && (
                  <button
                    type="button"
                    onClick={() => {
                      onChange?.('');
                      setOpen(false);
                    }}
                    className="rounded-lg px-2 py-1 text-xs font-medium text-gray-500 transition-colors hover:bg-gray-100 dark:hover:bg-gray-800"
                  >
                    Clear
                  </button>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>,
        document.body,
      )}
    </div>
  );
}
