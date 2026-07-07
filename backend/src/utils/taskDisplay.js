/** Shared display maps for task documents (task export + release notes). */
export const STATUS_LABELS = {
  backlog: 'Backlog',
  todo: 'To Do',
  in_progress: 'In Progress',
  in_review: 'In Review',
  done: 'Done',
};

export const PRIORITY_LABELS = { low: 'Low', medium: 'Medium', high: 'High', urgent: 'Urgent' };

export const STATUS_HEX = {
  backlog: '#78716c',
  todo: '#2563eb',
  in_progress: '#573dcb',
  in_review: '#b45309',
  done: '#047857',
};

export const PRIORITY_HEX = { low: '#78716c', medium: '#2563eb', high: '#b45309', urgent: '#b91c1c' };

export const BRAND_HEX = '#6a4fe6';

/** Order statuses "most shipped first" for release-note grouping. */
export const STATUS_ORDER = ['done', 'in_review', 'in_progress', 'todo', 'backlog'];

export const fmtDate = (d) =>
  d ? new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : '—';

export const fmtRange = (from, to) => `${fmtDate(from)} – ${fmtDate(to)}`;
