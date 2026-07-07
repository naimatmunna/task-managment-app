import { startOfWeek, endOfWeek, startOfMonth, endOfMonth } from 'date-fns';

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

// Due dates are stored as UTC midnight of a *calendar* day. To filter without
// timezone drift, every bound is the UTC start/end of the relevant calendar day
// (taken from the viewer's local calendar for presets like "today"/"this week").
const utcStart = (d) =>
  new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate(), 0, 0, 0, 0)).toISOString();
const utcEnd = (d) =>
  new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate(), 23, 59, 59, 999)).toISOString();

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
      api.dueAfter = utcStart(now);
      api.dueBefore = utcEnd(now);
      break;
    case 'week':
      api.dueAfter = utcStart(startOfWeek(now, WEEK));
      api.dueBefore = utcEnd(endOfWeek(now, WEEK));
      break;
    case 'month':
      api.dueAfter = utcStart(startOfMonth(now));
      api.dueBefore = utcEnd(endOfMonth(now));
      break;
    case 'custom':
      // Inputs are already `yyyy-MM-dd` calendar days — bound them in UTC directly.
      if (dueAfter) api.dueAfter = `${String(dueAfter).slice(0, 10)}T00:00:00.000Z`;
      if (dueBefore) api.dueBefore = `${String(dueBefore).slice(0, 10)}T23:59:59.999Z`;
      break;
    default:
      break;
  }
  return api;
};
