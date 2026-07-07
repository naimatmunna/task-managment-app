import { useEffect, useMemo, useRef, useState } from 'react';
import {
  addDays,
  addMonths,
  endOfMonth,
  endOfWeek,
  format,
  isAfter,
  isBefore,
  isSameDay,
  isSameMonth,
  isToday,
  startOfDay,
  startOfMonth,
  startOfWeek,
  subMonths,
} from 'date-fns';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { cn } from '@/lib/classNames.js';

/**
 * Parse a `yyyy-MM-dd` string (or Date) into a LOCAL Date at midnight.
 * Parsing with `new Date('yyyy-MM-dd')` treats the string as UTC and can shift
 * the day in negative offsets — this keeps the calendar day stable everywhere.
 */
export const parseYmd = (value) => {
  if (!value) return null;
  if (value instanceof Date) return Number.isNaN(value.getTime()) ? null : value;
  const [y, m, d] = String(value).slice(0, 10).split('-').map(Number);
  if (!y || !m || !d) return null;
  const date = new Date(y, m - 1, d);
  return Number.isNaN(date.getTime()) ? null : date;
};

/** Format a Date back to the `yyyy-MM-dd` string the API/native inputs expect. */
export const toYmd = (date) => (date ? format(date, 'yyyy-MM-dd') : '');

const CELL = 'h-9 w-9 text-sm';

/**
 * A self-contained month grid with prev/next navigation, min/max bounds and
 * full keyboard support (arrows, Home/End, PageUp/Down, Enter/Space).
 */
export default function Calendar({ selected, onSelect, min, max, weekStartsOn = 0, className }) {
  const today = startOfDay(new Date());
  const minDate = useMemo(() => (min ? startOfDay(parseYmd(min)) : null), [min]);
  const maxDate = useMemo(() => (max ? startOfDay(parseYmd(max)) : null), [max]);
  const selectedDate = useMemo(() => parseYmd(selected), [selected]);

  const [viewDate, setViewDate] = useState(selectedDate || today);
  const [focusDate, setFocusDate] = useState(selectedDate || today);
  const gridRef = useRef(null);
  const pendingFocus = useRef(false);

  // Follow the selected value if it changes from outside (e.g. quick "Today").
  useEffect(() => {
    if (selectedDate) {
      setViewDate(selectedDate);
      setFocusDate(selectedDate);
    }
  }, [selectedDate]);

  const isDisabled = (day) =>
    (minDate && isBefore(day, minDate)) || (maxDate && isAfter(day, maxDate));

  const weekdayLabels = useMemo(() => {
    const base = startOfWeek(new Date(2021, 7, 1), { weekStartsOn });
    return Array.from({ length: 7 }, (_, i) => format(addDays(base, i), 'EEEEEE'));
  }, [weekStartsOn]);

  const days = useMemo(() => {
    const start = startOfWeek(startOfMonth(viewDate), { weekStartsOn });
    const end = endOfWeek(endOfMonth(viewDate), { weekStartsOn });
    const out = [];
    for (let day = start; day <= end; day = addDays(day, 1)) out.push(day);
    return out;
  }, [viewDate, weekStartsOn]);

  // Focus the active day when the calendar first opens so keyboard users land
  // inside the grid (the popover is portaled, so Tab wouldn't reach it).
  useEffect(() => {
    const el = gridRef.current?.querySelector(`[data-day="${toYmd(focusDate)}"]`);
    el?.focus();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Move keyboard focus to the newly focused day after arrow navigation.
  useEffect(() => {
    if (!pendingFocus.current || !gridRef.current) return;
    pendingFocus.current = false;
    const el = gridRef.current.querySelector(`[data-day="${toYmd(focusDate)}"]`);
    el?.focus();
  }, [focusDate, viewDate]);

  const moveFocus = (next) => {
    pendingFocus.current = true;
    setFocusDate(next);
    if (!isSameMonth(next, viewDate)) setViewDate(next);
  };

  const onKeyDown = (e) => {
    let next = null;
    switch (e.key) {
      case 'ArrowLeft': next = addDays(focusDate, -1); break;
      case 'ArrowRight': next = addDays(focusDate, 1); break;
      case 'ArrowUp': next = addDays(focusDate, -7); break;
      case 'ArrowDown': next = addDays(focusDate, 7); break;
      case 'Home': next = startOfWeek(focusDate, { weekStartsOn }); break;
      case 'End': next = endOfWeek(focusDate, { weekStartsOn }); break;
      case 'PageUp': next = subMonths(focusDate, 1); break;
      case 'PageDown': next = addMonths(focusDate, 1); break;
      case 'Enter':
      case ' ':
        e.preventDefault();
        if (!isDisabled(focusDate)) onSelect?.(focusDate);
        return;
      default:
        return;
    }
    e.preventDefault();
    moveFocus(next);
  };

  const navBtn =
    'flex h-8 w-8 items-center justify-center rounded-lg text-gray-500 transition-colors hover:bg-gray-100 hover:text-gray-800 disabled:pointer-events-none disabled:opacity-40 dark:text-gray-400 dark:hover:bg-gray-800 dark:hover:text-gray-100';

  const canPrev = !minDate || isAfter(startOfMonth(viewDate), startOfMonth(minDate));
  const canNext = !maxDate || isBefore(endOfMonth(viewDate), endOfMonth(maxDate));

  return (
    <div className={cn('select-none', className)}>
      <div className="mb-2 flex items-center justify-between px-1">
        <button
          type="button"
          className={navBtn}
          onClick={() => setViewDate(subMonths(viewDate, 1))}
          disabled={!canPrev}
          aria-label="Previous month"
        >
          <ChevronLeft className="h-4 w-4" />
        </button>
        <span className="text-sm font-semibold text-gray-900 dark:text-gray-100">
          {format(viewDate, 'MMMM yyyy')}
        </span>
        <button
          type="button"
          className={navBtn}
          onClick={() => setViewDate(addMonths(viewDate, 1))}
          disabled={!canNext}
          aria-label="Next month"
        >
          <ChevronRight className="h-4 w-4" />
        </button>
      </div>

      <div className="grid grid-cols-7 px-0.5">
        {weekdayLabels.map((w) => (
          <div
            key={w}
            className="flex h-7 items-center justify-center text-xs font-medium text-gray-400"
          >
            {w}
          </div>
        ))}
      </div>

      <div ref={gridRef} onKeyDown={onKeyDown} className="grid grid-cols-7 px-0.5">
        {days.map((day) => {
          const outside = !isSameMonth(day, viewDate);
          const isSelected = selectedDate && isSameDay(day, selectedDate);
          const disabled = isDisabled(day);
          const isFocusable = isSameDay(day, focusDate);
          return (
            <div key={day.toISOString()} className="flex items-center justify-center py-0.5">
              <button
                type="button"
                data-day={toYmd(day)}
                tabIndex={isFocusable ? 0 : -1}
                disabled={disabled}
                aria-label={format(day, 'EEEE, MMMM d, yyyy')}
                aria-selected={isSelected || undefined}
                onClick={() => onSelect?.(day)}
                className={cn(
                  CELL,
                  'flex items-center justify-center rounded-lg font-medium transition-colors',
                  'focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-500/60',
                  disabled && 'cursor-not-allowed text-gray-300 dark:text-gray-600',
                  !disabled && !isSelected && 'text-gray-700 hover:bg-gray-100 dark:text-gray-200 dark:hover:bg-gray-800',
                  !disabled && outside && !isSelected && 'text-gray-300 dark:text-gray-600',
                  isSelected && 'bg-brand-600 text-white shadow-sm hover:bg-brand-600',
                  !isSelected && isToday(day) && 'ring-1 ring-inset ring-brand-400/70',
                )}
              >
                {format(day, 'd')}
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
}
