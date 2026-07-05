import {
  startOfDay,
  endOfDay,
  startOfWeek,
  endOfWeek,
  startOfMonth,
  endOfMonth,
} from 'date-fns';

/** Due-date filter presets shown in the tasks filter bar. */
export const DUE_PRESETS = [
  { value: '', label: 'Any due date' },
  { value: 'overdue', label: 'Overdue' },
  { value: 'today', label: 'Due today' },
  { value: 'week', label: 'Due this week' },
  { value: 'month', label: 'Due this month' },
  { value: 'custom', label: 'Custom range…' },
];

export const DUE_LABELS = Object.fromEntries(DUE_PRESETS.map((p) => [p.value, p.label]));

const WEEK = { weekStartsOn: 1 }; // Monday-based work week

/**
 * Translate the URL filter state into the query params the API understands.
 * The `due` preset becomes concrete `dueAfter` / `dueBefore` / `overdue` bounds
 * so shareable URLs stay readable (`?due=week`) while the server stays generic.
 */
export const toApiFilters = (filters = {}) => {
  const { due, dueAfter, dueBefore, ...rest } = filters;
  const api = { ...rest };
  const now = new Date();

  switch (due) {
    case 'overdue':
      api.overdue = 'true';
      break;
    case 'today':
      api.dueAfter = startOfDay(now).toISOString();
      api.dueBefore = endOfDay(now).toISOString();
      break;
    case 'week':
      api.dueAfter = startOfWeek(now, WEEK).toISOString();
      api.dueBefore = endOfWeek(now, WEEK).toISOString();
      break;
    case 'month':
      api.dueAfter = startOfMonth(now).toISOString();
      api.dueBefore = endOfMonth(now).toISOString();
      break;
    case 'custom':
      if (dueAfter) api.dueAfter = startOfDay(new Date(dueAfter)).toISOString();
      if (dueBefore) api.dueBefore = endOfDay(new Date(dueBefore)).toISOString();
      break;
    default:
      break;
  }
  return api;
};
