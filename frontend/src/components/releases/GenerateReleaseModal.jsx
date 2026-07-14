import { useMemo, useState } from 'react';
import {
  format,
  startOfDay,
  endOfDay,
  startOfWeek,
  endOfWeek,
  startOfMonth,
  endOfMonth,
  subDays,
  subWeeks,
  subMonths,
} from 'date-fns';
import toast from 'react-hot-toast';
import { Sparkles, CheckSquare, Square, Search } from 'lucide-react';
import { useCreateReleaseNoteMutation } from '@/features/releases/releaseApi.js';
import { useTaskListQuery, useLazyTaskIdsQuery } from '@/features/tasks/taskApi.js';
import { useDirectory } from '@/hooks/useDirectory.js';
import { useDebounce } from '@/hooks/useDebounce.js';
import { getApiErrorMessage } from '@/helpers/apiError.js';
import { TASK_COLUMNS, TASK_PRIORITY } from '@/constants';
import Modal from '@/components/ui/Modal.jsx';
import Input from '@/components/ui/Input.jsx';
import Button from '@/components/ui/Button.jsx';
import Select from '@/components/ui/Select.jsx';
import DatePicker from '@/components/ui/DatePicker.jsx';
import Pagination from '@/components/ui/Pagination.jsx';
import Avatar from '@/components/ui/Avatar.jsx';
import Spinner from '@/components/ui/Spinner.jsx';
import StatusBadge from '@/components/tasks/StatusBadge.jsx';
import PriorityBadge from '@/components/tasks/PriorityBadge.jsx';
import { cn } from '@/lib/classNames.js';

const WEEK = { weekStartsOn: 1 };
const ymd = (d) => format(d, 'yyyy-MM-dd');

/** Predefined completion windows (release = tasks completed in a range). */
const rangeForPreset = (preset) => {
  const now = new Date();
  switch (preset) {
    case 'today':
      return { from: ymd(now), to: ymd(now) };
    case 'yesterday': {
      const y = subDays(now, 1);
      return { from: ymd(y), to: ymd(y) };
    }
    case 'week':
      return { from: ymd(startOfWeek(now, WEEK)), to: ymd(endOfWeek(now, WEEK)) };
    case 'lastWeek': {
      const lw = subWeeks(now, 1);
      return { from: ymd(startOfWeek(lw, WEEK)), to: ymd(endOfWeek(lw, WEEK)) };
    }
    case 'month':
      return { from: ymd(startOfMonth(now)), to: ymd(now) };
    case 'lastMonth': {
      const lm = subMonths(now, 1);
      return { from: ymd(startOfMonth(lm)), to: ymd(endOfMonth(lm)) };
    }
    default:
      return null; // custom — caller keeps its own dates
  }
};

const PRESETS = [
  { value: 'today', label: 'Today' },
  { value: 'yesterday', label: 'Yesterday' },
  { value: 'week', label: 'This week' },
  { value: 'lastWeek', label: 'Last week' },
  { value: 'month', label: 'This month' },
  { value: 'lastMonth', label: 'Last month' },
  { value: 'custom', label: 'Custom range' },
];

const LIMIT = 10;

export default function GenerateReleaseModal({ open, onClose, onCreated }) {
  const [create, { isLoading }] = useCreateReleaseNoteMutation();
  const [fetchIds, { isFetching: fetchingIds }] = useLazyTaskIdsQuery();
  const { members, teams } = useDirectory();

  const [preset, setPreset] = useState('month');
  const initial = rangeForPreset('month');
  const [from, setFrom] = useState(initial.from);
  const [to, setTo] = useState(initial.to);

  const [filters, setFilters] = useState({ status: '', priority: '', assigneeId: '', teamId: '', search: '' });
  const [page, setPage] = useState(1);
  // Selection is a Set of task ids, kept SEPARATE from filters/pagination so
  // changing a filter never drops a previously-selected task.
  const [selected, setSelected] = useState(() => new Set());

  const [version, setVersion] = useState('');
  const [title, setTitle] = useState('');
  const [details, setDetails] = useState('');

  const debouncedSearch = useDebounce(filters.search, 300);

  const onPreset = (value) => {
    setPreset(value);
    setPage(1);
    const r = rangeForPreset(value);
    if (r) {
      setFrom(r.from);
      setTo(r.to);
    }
  };

  const setFilter = (key, value) => {
    setFilters((f) => ({ ...f, [key]: value }));
    setPage(1);
  };

  const rangeValid = from && to && new Date(from) <= new Date(to);

  // Params shared by the candidate list and the "select all matching" ids call.
  const queryFilters = useMemo(
    () => ({
      completedAfter: rangeValid ? startOfDay(new Date(from)).toISOString() : undefined,
      completedBefore: rangeValid ? endOfDay(new Date(to)).toISOString() : undefined,
      status: filters.status || undefined,
      priority: filters.priority || undefined,
      assigneeId: filters.assigneeId || undefined,
      teamId: filters.teamId || undefined,
      search: debouncedSearch || undefined,
      sort: '-completedAt',
    }),
    [rangeValid, from, to, filters.status, filters.priority, filters.assigneeId, filters.teamId, debouncedSearch],
  );

  const { data, isFetching } = useTaskListQuery({ ...queryFilters, page, limit: LIMIT }, { skip: !open || !rangeValid });
  const tasks = data?.tasks || [];
  const matchingTotal = data?.meta?.pagination?.total ?? 0;
  const totalPages = data?.meta?.pagination?.totalPages ?? 1;

  const visibleIds = tasks.map((t) => t.id);
  const allVisibleSelected = visibleIds.length > 0 && visibleIds.every((id) => selected.has(id));

  const toggleOne = (id) =>
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

  const toggleVisible = () =>
    setSelected((prev) => {
      const next = new Set(prev);
      if (allVisibleSelected) visibleIds.forEach((id) => next.delete(id));
      else visibleIds.forEach((id) => next.add(id));
      return next;
    });

  const selectAllMatching = async () => {
    try {
      const ids = await fetchIds(queryFilters).unwrap();
      setSelected((prev) => new Set([...prev, ...ids]));
    } catch (err) {
      toast.error(getApiErrorMessage(err, 'Could not select all tasks'));
    }
  };

  const clearSelection = () => setSelected(new Set());

  const onSubmit = async (e) => {
    e.preventDefault();
    if (!rangeValid) return toast.error('Pick a valid date range (end on or after start)');
    if (selected.size === 0) return toast.error('Select at least one task before creating the release.');
    try {
      const res = await create({
        from: startOfDay(new Date(from)).toISOString(),
        to: endOfDay(new Date(to)).toISOString(),
        taskIds: [...selected],
        version: version.trim(),
        title: title.trim(),
        details,
      }).unwrap();
      toast.success(res.message || 'Release note generated');
      onClose();
      onCreated?.(res.data.releaseNote.id);
    } catch (err) {
      toast.error(getApiErrorMessage(err));
    }
    return undefined;
  };

  return (
    <Modal open={open} onClose={onClose} title="Generate release note" size="3xl" bodyClassName="flex flex-1 flex-col overflow-hidden">
      <form onSubmit={onSubmit} className="flex min-h-0 flex-1 flex-col">
        {/* Range + filters */}
        <div className="shrink-0 space-y-3 border-b border-gray-200/70 pb-4 dark:border-white/10">
          <div className="flex flex-wrap items-end gap-3">
            <div className="w-40">
              <Select label="Completed in" value={preset} onChange={(e) => onPreset(e.target.value)}>
                {PRESETS.map((p) => (
                  <option key={p.value} value={p.value}>{p.label}</option>
                ))}
              </Select>
            </div>
            {preset === 'custom' && (
              <div className="flex items-end gap-2">
                <div className="w-36">
                  <DatePicker label="From" value={from} max={to || undefined} onChange={(v) => { setFrom(v); setPage(1); }} aria-label="From date" />
                </div>
                <span className="pb-2.5 text-gray-400">→</span>
                <div className="w-36">
                  <DatePicker label="To" value={to} min={from || undefined} onChange={(v) => { setTo(v); setPage(1); }} align="end" aria-label="To date" />
                </div>
              </div>
            )}
            <div className="min-w-[10rem] flex-1">
              <Input icon={Search} placeholder="Search tasks…" value={filters.search} onChange={(e) => setFilter('search', e.target.value)} />
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            <Select className="h-9 w-auto py-0" value={filters.status} onChange={(e) => setFilter('status', e.target.value)} aria-label="Status filter">
              <option value="">Any status</option>
              {TASK_COLUMNS.map((c) => (<option key={c.key} value={c.key}>{c.label}</option>))}
            </Select>
            <Select className="h-9 w-auto py-0" value={filters.priority} onChange={(e) => setFilter('priority', e.target.value)} aria-label="Priority filter">
              <option value="">Any priority</option>
              {Object.values(TASK_PRIORITY).map((p) => (<option key={p} value={p} className="capitalize">{p}</option>))}
            </Select>
            <Select className="h-9 w-auto py-0" value={filters.assigneeId} onChange={(e) => setFilter('assigneeId', e.target.value)} aria-label="Assignee filter">
              <option value="">Any assignee</option>
              {members.map((m) => (<option key={m.id} value={m.id}>{m.name}</option>))}
            </Select>
            <Select className="h-9 w-auto py-0" value={filters.teamId} onChange={(e) => setFilter('teamId', e.target.value)} aria-label="Team filter">
              <option value="">Any team</option>
              {teams.map((t) => (<option key={t.id} value={t.id}>{t.name}</option>))}
            </Select>
          </div>
        </div>

        {/* Selection toolbar */}
        <div className="flex shrink-0 flex-wrap items-center justify-between gap-2 py-2.5 text-sm">
          <div className="flex items-center gap-3">
            <span className="font-medium text-gray-700 dark:text-gray-200">
              {selected.size} task{selected.size === 1 ? '' : 's'} selected
            </span>
            {selected.size > 0 && (
              <button type="button" onClick={clearSelection} className="text-gray-500 hover:text-danger-600 dark:text-gray-400">
                Clear
              </button>
            )}
          </div>
          {matchingTotal > 0 && (
            <button
              type="button"
              onClick={selectAllMatching}
              disabled={fetchingIds}
              className="inline-flex items-center gap-1.5 font-medium text-brand-600 hover:text-brand-700 disabled:opacity-50 dark:text-brand-400"
            >
              {fetchingIds ? <Spinner size="sm" className="h-3.5 w-3.5 border-2" /> : <CheckSquare className="h-4 w-4" />}
              Select all {matchingTotal} matching
            </button>
          )}
        </div>

        {/* Candidate task table */}
        <div className="min-h-0 flex-1 overflow-auto rounded-xl border border-gray-200/70 dark:border-white/10">
          {!rangeValid ? (
            <p className="p-8 text-center text-sm text-gray-400">Pick a valid date range to see completed tasks.</p>
          ) : isFetching && tasks.length === 0 ? (
            <div className="flex items-center justify-center p-10"><Spinner /></div>
          ) : tasks.length === 0 ? (
            <p className="p-8 text-center text-sm text-gray-400">No tasks were found for the selected date range and filters.</p>
          ) : (
            <table className={cn('w-full text-sm transition-opacity', isFetching && 'opacity-60')}>
              <thead className="sticky top-0 z-10 bg-gray-50 text-left text-xs uppercase tracking-wide text-gray-400 dark:bg-gray-800/80">
                <tr>
                  <th className="w-10 px-3 py-2.5">
                    <button type="button" onClick={toggleVisible} aria-label={allVisibleSelected ? 'Deselect visible' : 'Select visible'} className="align-middle text-gray-500 hover:text-brand-600">
                      {allVisibleSelected ? <CheckSquare className="h-4 w-4 text-brand-600" /> : <Square className="h-4 w-4" />}
                    </button>
                  </th>
                  <th className="px-3 py-2.5 font-medium">Task</th>
                  <th className="px-3 py-2.5 font-medium">Status</th>
                  <th className="px-3 py-2.5 font-medium">Priority</th>
                  <th className="px-3 py-2.5 font-medium">Assignee</th>
                  <th className="px-3 py-2.5 font-medium">Completed</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-black/5 dark:divide-white/10">
                {tasks.map((t) => {
                  const checked = selected.has(t.id);
                  return (
                    <tr
                      key={t.id}
                      onClick={() => toggleOne(t.id)}
                      className={cn('cursor-pointer', checked ? 'bg-brand-50/60 dark:bg-brand-500/10' : 'hover:bg-gray-50/70 dark:hover:bg-gray-800/40')}
                    >
                      <td className="px-3 py-2.5">
                        <input
                          type="checkbox"
                          checked={checked}
                          onChange={() => toggleOne(t.id)}
                          onClick={(e) => e.stopPropagation()}
                          className="h-4 w-4 cursor-pointer rounded border-gray-300 text-brand-600 accent-brand-600 focus:ring-brand-500/40 dark:border-gray-600"
                          aria-label={`Select ${t.title}`}
                        />
                      </td>
                      <td className="max-w-xs px-3 py-2.5"><span className="block truncate font-medium text-gray-900 dark:text-gray-100">{t.title}</span></td>
                      <td className="px-3 py-2.5"><StatusBadge status={t.status} /></td>
                      <td className="px-3 py-2.5"><PriorityBadge priority={t.priority} /></td>
                      <td className="px-3 py-2.5">
                        {t.assigneeId ? (
                          <span className="flex items-center gap-1.5 text-gray-600 dark:text-gray-300">
                            <Avatar name={t.assigneeId.name} src={t.assigneeId.avatar?.url} size="xs" /> {t.assigneeId.name}
                          </span>
                        ) : <span className="text-gray-400">—</span>}
                      </td>
                      <td className="px-3 py-2.5 text-gray-500">{t.completedAt ? format(new Date(t.completedAt), 'MMM d') : '—'}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>

        {rangeValid && totalPages > 1 && (
          <Pagination page={page} pageSize={LIMIT} total={matchingTotal} totalPages={totalPages} onChange={setPage} label="tasks" className="mt-2 shrink-0" />
        )}

        {/* Metadata + actions */}
        <div className="mt-3 shrink-0 space-y-3 border-t border-gray-200/70 pt-4 dark:border-white/10">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <Input label="Version (optional)" placeholder="v1.2.0" value={version} onChange={(e) => setVersion(e.target.value)} />
            <Input label="Title (optional)" placeholder="Auto from dates" value={title} onChange={(e) => setTitle(e.target.value)} />
          </div>
          <div>
            <label htmlFor="rel-details" className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-300">Overview (optional)</label>
            <textarea
              id="rel-details"
              value={details}
              onChange={(e) => setDetails(e.target.value)}
              rows={2}
              placeholder="Highlights or context to include at the top of the document…"
              className="w-full rounded-xl border border-gray-200 bg-white px-3.5 py-2.5 text-sm text-gray-900 shadow-xs transition placeholder:text-gray-400 focus:border-brand-500 focus:outline-none focus:ring-4 focus:ring-brand-500/12 dark:border-white/10 dark:bg-gray-800/80 dark:text-gray-100 dark:placeholder:text-gray-500"
            />
          </div>
          <div className="flex justify-end gap-2">
            <Button type="button" variant="secondary" onClick={onClose}>Cancel</Button>
            <Button type="submit" isLoading={isLoading} disabled={selected.size === 0}>
              <Sparkles className="h-4 w-4" /> Generate {selected.size > 0 ? `(${selected.size})` : ''}
            </Button>
          </div>
        </div>
      </form>
    </Modal>
  );
}
