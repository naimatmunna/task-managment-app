import { Search, X } from 'lucide-react';
import { format } from 'date-fns';
import { useDirectory } from '@/hooks/useDirectory.js';
import { TASK_COLUMNS, TASK_PRIORITY, PRIORITY_META } from '@/constants';
import { DUE_PRESETS, DUE_LABELS } from '@/features/tasks/taskQuery.js';
import DatePicker from '@/components/ui/DatePicker.jsx';

const STATUS_LABEL = Object.fromEntries(TASK_COLUMNS.map((c) => [c.key, c.label]));
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const pad2 = (n) => String(n).padStart(2, '0');

// Compact, consistent filter controls.
const SEL =
  'select-field h-9 rounded-lg border border-gray-200 bg-white pl-3 pr-8 text-sm text-gray-700 shadow-xs transition-colors focus:border-brand-500 focus:outline-none dark:border-white/10 dark:bg-gray-800/70 dark:text-gray-200';

/** Compact, URL-backed task filter bar with due-date ranges + removable chips. */
export default function TaskFilters({ filters, setFilter, setFilters, clear, activeCount, showStatus = false, resultCount }) {
  const { members, teams } = useDirectory();

  const memberName = (id) =>
    id === 'none' ? 'Unassigned' : members.find((m) => m.id === id)?.name || 'Member';
  const teamName = (id) => teams.find((t) => t.id === id)?.name || 'Team';

  const now = new Date();
  const currentMonthStr = `${now.getFullYear()}-${pad2(now.getMonth() + 1)}`;
  const years = [];
  for (let y = now.getFullYear() - 3; y <= now.getFullYear() + 3; y += 1) years.push(y);
  const [selYear, selMonth] = (filters.dueMonth || currentMonthStr).split('-');

  // Switching the due preset and clearing the sub-controls (custom range /
  // picked month) must be one atomic update — separate setFilter calls clobber.
  const onDue = (val) => {
    if (val === 'custom') setFilters({ due: val, dueMonth: '' });
    else if (val === 'monthPick')
      setFilters({ due: val, dueAfter: '', dueBefore: '', dueMonth: filters.dueMonth || currentMonthStr });
    else setFilters({ due: val, dueAfter: '', dueBefore: '', dueMonth: '' });
  };

  const chips = [];
  if (filters.search) chips.push({ key: 'search', label: `“${filters.search}”`, remove: () => setFilter('search', '') });
  if (showStatus && filters.status)
    chips.push({ key: 'status', label: `Status · ${STATUS_LABEL[filters.status] || filters.status}`, remove: () => setFilter('status', '') });
  if (filters.priority)
    chips.push({ key: 'priority', label: `Priority · ${PRIORITY_META[filters.priority]?.label || filters.priority}`, remove: () => setFilter('priority', '') });
  if (filters.assigneeId)
    chips.push({ key: 'assignee', label: `Assignee · ${memberName(filters.assigneeId)}`, remove: () => setFilter('assigneeId', '') });
  if (filters.teamId)
    chips.push({ key: 'team', label: `Team · ${teamName(filters.teamId)}`, remove: () => setFilter('teamId', '') });
  if (filters.due) {
    let label = DUE_LABELS[filters.due] || filters.due;
    if (filters.due === 'custom') {
      const a = filters.dueAfter ? format(new Date(filters.dueAfter), 'MMM d') : '…';
      const b = filters.dueBefore ? format(new Date(filters.dueBefore), 'MMM d') : '…';
      label = `Due · ${a} – ${b}`;
    } else if (filters.due === 'monthPick') {
      const [yy, mm] = (filters.dueMonth || '').split('-').map(Number);
      label = yy && mm ? `Due · ${format(new Date(yy, mm - 1, 1), 'MMM yyyy')}` : 'Due · month';
    }
    chips.push({ key: 'due', label, remove: () => onDue('') });
  }

  return (
    <div className="mb-4 space-y-2.5">
      <div className="flex flex-wrap items-center gap-2">
        <div className="relative w-full sm:w-60">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
          <input
            value={filters.search || ''}
            onChange={(e) => setFilter('search', e.target.value)}
            placeholder="Search…"
            className="h-9 w-full rounded-lg border border-gray-200 bg-white pl-9 pr-3 text-sm shadow-xs transition-colors placeholder:text-gray-400 focus:border-brand-500 focus:outline-none dark:border-white/10 dark:bg-gray-800/70"
          />
        </div>

        {showStatus && (
          <select className={SEL} value={filters.status || ''} onChange={(e) => setFilter('status', e.target.value)}>
            <option value="">All statuses</option>
            {TASK_COLUMNS.map((c) => (
              <option key={c.key} value={c.key}>{c.label}</option>
            ))}
          </select>
        )}

        <select className={SEL} value={filters.priority || ''} onChange={(e) => setFilter('priority', e.target.value)}>
          <option value="">Priority</option>
          {Object.values(TASK_PRIORITY).map((p) => (
            <option key={p} value={p} className="capitalize">{p}</option>
          ))}
        </select>

        <select className={SEL} value={filters.assigneeId || ''} onChange={(e) => setFilter('assigneeId', e.target.value)}>
          <option value="">Anyone</option>
          <option value="none">Unassigned</option>
          {members.map((m) => (
            <option key={m.id} value={m.id}>{m.name}</option>
          ))}
        </select>

        <select className={SEL} value={filters.teamId || ''} onChange={(e) => setFilter('teamId', e.target.value)}>
          <option value="">All teams</option>
          {teams.map((t) => (
            <option key={t.id} value={t.id}>{t.name}</option>
          ))}
        </select>

        <select className={SEL} value={filters.due || ''} onChange={(e) => onDue(e.target.value)}>
          {DUE_PRESETS.map((d) => (
            <option key={d.value} value={d.value}>{d.label}</option>
          ))}
        </select>

        {resultCount != null && (
          <span className="ml-auto whitespace-nowrap text-sm tabular-nums text-gray-400">
            {resultCount} {resultCount === 1 ? 'task' : 'tasks'}
          </span>
        )}
      </div>

      {filters.due === 'monthPick' && (
        <div className="flex flex-wrap items-center gap-2 rounded-lg border border-gray-200/70 bg-gray-50/70 px-3 py-2 dark:border-white/10 dark:bg-gray-800/40">
          <span className="text-xs font-medium text-gray-500">Due in month</span>
          <select
            className={SEL}
            value={selMonth}
            onChange={(e) => setFilter('dueMonth', `${selYear}-${e.target.value}`)}
            aria-label="Month"
          >
            {MONTHS.map((label, i) => (
              <option key={label} value={pad2(i + 1)}>
                {label}
              </option>
            ))}
          </select>
          <select
            className={SEL}
            value={selYear}
            onChange={(e) => setFilter('dueMonth', `${e.target.value}-${selMonth}`)}
            aria-label="Year"
          >
            {years.map((y) => (
              <option key={y} value={String(y)}>
                {y}
              </option>
            ))}
          </select>
        </div>
      )}

      {filters.due === 'custom' && (
        <div className="flex flex-wrap items-center gap-2 rounded-lg border border-gray-200/70 bg-gray-50/70 px-3 py-2 dark:border-white/10 dark:bg-gray-800/40">
          <span className="text-xs font-medium text-gray-500">Due between</span>
          <div className="w-full sm:w-40">
            <DatePicker
              size="sm"
              placeholder="Start"
              value={filters.dueAfter || ''}
              max={filters.dueBefore || undefined}
              onChange={(v) => setFilter('dueAfter', v)}
              aria-label="Due after"
            />
          </div>
          <span className="hidden text-gray-400 sm:inline">→</span>
          <div className="w-full sm:w-40">
            <DatePicker
              size="sm"
              placeholder="End"
              align="end"
              value={filters.dueBefore || ''}
              min={filters.dueAfter || undefined}
              onChange={(v) => setFilter('dueBefore', v)}
              aria-label="Due before"
            />
          </div>
        </div>
      )}

      {chips.length > 0 && (
        <div className="flex flex-wrap items-center gap-1.5">
          {chips.map((c) => (
            <button
              key={c.key}
              onClick={c.remove}
              className="badge-glass inline-flex items-center gap-1 rounded-full bg-brand-500/15 px-2.5 py-1 text-xs font-medium text-brand-700 ring-1 ring-inset ring-brand-500/25 transition-colors hover:bg-brand-500/25 dark:bg-brand-500/15 dark:text-brand-200 dark:ring-brand-500/25"
            >
              {c.label}
              <X className="h-3 w-3 opacity-70" />
            </button>
          ))}
          {activeCount > 1 && (
            <button
              onClick={clear}
              className="ml-1 text-xs font-medium text-gray-500 underline-offset-2 transition-colors hover:text-gray-800 hover:underline dark:text-gray-400 dark:hover:text-gray-200"
            >
              Clear all
            </button>
          )}
        </div>
      )}
    </div>
  );
}
