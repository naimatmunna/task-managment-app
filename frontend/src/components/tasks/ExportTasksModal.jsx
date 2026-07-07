import { useState } from 'react';
import { format, startOfWeek, endOfWeek } from 'date-fns';
import toast from 'react-hot-toast';
import { FileText, FileType2, Loader2 } from 'lucide-react';
import { toApiFilters } from '@/features/tasks/taskQuery.js';
import { downloadTaskExport } from '@/features/tasks/taskExport.js';
import { useDirectory } from '@/hooks/useDirectory.js';
import Modal from '@/components/ui/Modal.jsx';
import Segmented from '@/components/ui/Segmented.jsx';
import Select from '@/components/ui/Select.jsx';
import DatePicker from '@/components/ui/DatePicker.jsx';
import { cn } from '@/lib/classNames.js';

const PERIODS = [
  { value: 'all', label: 'All' },
  { value: 'today', label: 'Today' },
  { value: 'week', label: 'This week' },
  { value: 'month', label: 'This month' },
  { value: 'custom', label: 'Custom' },
];

const WEEK = { weekStartsOn: 1 };

export default function ExportTasksModal({ open, onClose }) {
  const { members } = useDirectory();
  const [period, setPeriod] = useState('all');
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [assigneeId, setAssigneeId] = useState('');
  const [busy, setBusy] = useState(null);

  const buildParams = () => {
    const f = {};
    if (['today', 'week', 'month'].includes(period)) f.due = period;
    if (period === 'custom') {
      f.due = 'custom';
      f.dueAfter = from;
      f.dueBefore = to;
    }
    if (assigneeId) f.assigneeId = assigneeId;
    return toApiFilters(f);
  };

  const employeeName = () => (assigneeId ? members.find((m) => m.id === assigneeId)?.name || '' : '');

  // Human, month-aware description of the chosen period (e.g. "July 2026").
  const periodText = () => {
    const now = new Date();
    switch (period) {
      case 'today':
        return `Today, ${format(now, 'MMMM d, yyyy')}`;
      case 'week':
        return `${format(startOfWeek(now, WEEK), 'MMMM d')} – ${format(endOfWeek(now, WEEK), 'MMMM d, yyyy')}`;
      case 'month':
        return format(now, 'MMMM yyyy');
      case 'custom':
        return from && to
          ? `${format(new Date(from), 'MMMM d')} – ${format(new Date(to), 'MMMM d, yyyy')}`
          : 'Custom range';
      default:
        return 'All tasks';
    }
  };

  // Shown in the document header.
  const buildLabel = () => {
    const emp = employeeName();
    return emp ? `${periodText()} · ${emp}` : periodText();
  };

  // Friendly, filesystem-safe download name, e.g. "Task List - July 2026 - Grace Hopper".
  const buildFilename = () => {
    const emp = employeeName();
    let name = `Task List - ${periodText().replace(/\s*–\s*/g, ' to ')}`;
    if (emp) name += ` - ${emp}`;
    return name.replace(/[\\/:*?"<>|]+/g, ' ').replace(/\s+/g, ' ').trim();
  };

  const onExport = async (fmt) => {
    if (period === 'custom' && (!from || !to)) {
      toast.error('Pick a start and end date for a custom range');
      return;
    }
    setBusy(fmt);
    try {
      await downloadTaskExport(fmt, buildParams(), buildLabel(), buildFilename());
      toast.success(`Exported as ${fmt === 'docx' ? 'Word' : 'PDF'}`);
      onClose();
    } catch {
      toast.error('Export failed. Please try again.');
    } finally {
      setBusy(null);
    }
  };

  const formatBtn = (fmt, Icon, title, sub, tint) => (
    <button
      type="button"
      disabled={busy}
      onClick={() => onExport(fmt)}
      className={cn(
        'group flex flex-1 items-center gap-3 rounded-xl border border-gray-200 bg-white p-3.5 text-left shadow-xs transition-all duration-150 ease-smooth',
        'hover:-translate-y-0.5 hover:border-brand-300/60 hover:shadow-card disabled:cursor-not-allowed disabled:opacity-60 disabled:hover:translate-y-0',
        'dark:border-white/10 dark:bg-gray-800/60',
      )}
    >
      <span className={cn('flex h-10 w-10 shrink-0 items-center justify-center rounded-lg', tint)}>
        {busy === fmt ? <Loader2 className="h-5 w-5 animate-spin" /> : <Icon className="h-5 w-5" />}
      </span>
      <span className="min-w-0">
        <span className="block text-sm font-semibold text-gray-900 dark:text-gray-100">{title}</span>
        <span className="block text-xs text-gray-500 dark:text-gray-400">{sub}</span>
      </span>
    </button>
  );

  return (
    <Modal open={open} onClose={onClose} title="Export task list">
      <div className="space-y-5">
        {/* Step 1 — scope */}
        <div>
          <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-gray-400">1 · What to export</p>
          <Segmented value={period} onChange={setPeriod} options={PERIODS} className="flex-wrap" />

          {period === 'custom' && (
            <div className="mt-3 flex flex-wrap items-center gap-2 rounded-lg border border-gray-200/70 bg-gray-50/70 px-3 py-2.5 dark:border-white/10 dark:bg-gray-800/40">
              <span className="text-xs font-medium text-gray-500">Between</span>
              <div className="w-full sm:flex-1">
                <DatePicker size="sm" placeholder="Start" value={from} max={to || undefined} onChange={setFrom} aria-label="From date" />
              </div>
              <span className="hidden text-gray-400 sm:inline">→</span>
              <div className="w-full sm:flex-1">
                <DatePicker size="sm" placeholder="End" align="end" value={to} min={from || undefined} onChange={setTo} aria-label="To date" />
              </div>
            </div>
          )}

          <div className="mt-3">
            <Select label="Employee (optional)" value={assigneeId} onChange={(e) => setAssigneeId(e.target.value)}>
              <option value="">Everyone</option>
              {members.map((m) => (
                <option key={m.id} value={m.id}>{m.name}</option>
              ))}
            </Select>
          </div>

          <p className="mt-3 rounded-lg bg-brand-50 px-3 py-2 text-xs text-brand-700 dark:bg-brand-500/10 dark:text-brand-300">
            Exporting: <span className="font-semibold">{buildLabel()}</span>
          </p>
        </div>

        {/* Step 2 — format */}
        <div>
          <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-gray-400">2 · Choose a format</p>
          <div className="flex flex-col gap-2.5 sm:flex-row">
            {formatBtn('pdf', FileText, 'PDF', 'Print-ready document', 'bg-red-50 text-red-600 dark:bg-red-500/15 dark:text-red-400')}
            {formatBtn('docx', FileType2, 'Word', 'Editable .docx file', 'bg-info-50 text-info-600 dark:bg-info-500/15 dark:text-info-400')}
          </div>
        </div>
      </div>
    </Modal>
  );
}
