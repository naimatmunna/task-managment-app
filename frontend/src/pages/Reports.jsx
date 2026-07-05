import { useMemo } from 'react';
import toast from 'react-hot-toast';
import { format } from 'date-fns';
import {
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  AreaChart,
  Area,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
} from 'recharts';
import {
  Download,
  FileText,
  Mail,
  Layers,
  CheckCircle2,
  Timer,
  AlertTriangle,
  Target,
  CalendarRange,
} from 'lucide-react';
import { useReportQuery, useEmailReportMutation, downloadReport } from '@/features/reports/reportApi.js';
import { useTaskFilters } from '@/hooks/useTaskFilters.js';
import { useDirectory } from '@/hooks/useDirectory.js';
import { getApiErrorMessage } from '@/helpers/apiError.js';
import { TASK_COLUMNS } from '@/constants';
import PageHeader from '@/components/app/PageHeader.jsx';
import PageMeta from '@/components/common/PageMeta.jsx';
import Card from '@/components/ui/Card.jsx';
import Button from '@/components/ui/Button.jsx';
import Select from '@/components/ui/Select.jsx';
import Segmented from '@/components/ui/Segmented.jsx';
import PriorityBadge from '@/components/tasks/PriorityBadge.jsx';
import Skeleton from '@/components/ui/Skeleton.jsx';
import { cn } from '@/lib/classNames.js';

const STATUS_LABEL = Object.fromEntries(TASK_COLUMNS.map((c) => [c.key, c.label]));
const STATUS_COLORS = {
  backlog: '#a8a39d',
  todo: '#3b82f6',
  in_progress: '#6a4fe6',
  in_review: '#f59e0b',
  done: '#10b981',
};

const RANGE_OPTS = [
  { value: 'daily', label: 'Today' },
  { value: 'weekly', label: 'This week' },
  { value: 'monthly', label: 'This month' },
  { value: 'custom', label: 'Custom' },
];
const SCOPE_OPTS = [
  { value: 'org', label: 'Organization' },
  { value: 'me', label: 'Assigned to me' },
  { value: 'team', label: 'By team' },
];

/** Branded chart tooltip (recharts' default is off-theme). */
function ChartTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-lg border border-gray-200/70 bg-white px-3 py-2 text-xs shadow-pop dark:border-white/10 dark:bg-gray-900">
      {label != null && <div className="mb-1 font-medium text-gray-700 dark:text-gray-200">{label}</div>}
      {payload.map((p, i) => (
        <div key={i} className="flex items-center gap-2 py-0.5">
          <span className="h-2 w-2 rounded-full" style={{ background: p.color || p.fill }} />
          <span className="capitalize text-gray-500 dark:text-gray-400">{p.name}</span>
          <span className="ml-3 font-semibold tabular-nums text-gray-900 dark:text-gray-100">{p.value}</span>
        </div>
      ))}
    </div>
  );
}

function SummaryCard({ label, value, icon: Icon, accent, tint }) {
  return (
    <Card className="flex items-center gap-3 p-4">
      <span className={cn('flex h-10 w-10 shrink-0 items-center justify-center rounded-xl', tint)}>
        <Icon className="h-[18px] w-[18px]" />
      </span>
      <div className="min-w-0">
        <p className="text-xs font-medium uppercase tracking-wide text-gray-400">{label}</p>
        <p className={cn('text-2xl font-bold tabular-nums', accent || 'text-gray-900 dark:text-gray-100')}>{value}</p>
      </div>
    </Card>
  );
}

function ChartCard({ title, children, empty }) {
  return (
    <Card className="p-5">
      <h3 className="mb-4 text-sm font-semibold text-gray-900 dark:text-gray-100">{title}</h3>
      {empty ? (
        <div className="flex h-56 items-center justify-center text-sm text-gray-400">No data in this range</div>
      ) : (
        <div className="h-56">{children}</div>
      )}
    </Card>
  );
}

export default function Reports() {
  const { filters, setFilter } = useTaskFilters();
  const { teams } = useDirectory();
  const range = filters.range || 'weekly';
  const scope = filters.scope || 'org';

  const query = { range, scope };
  if (scope === 'team') query.teamId = filters.teamId;
  if (range === 'custom') {
    query.from = filters.from;
    query.to = filters.to;
  }

  const needsTeam = scope === 'team' && !filters.teamId;
  const needsDates = range === 'custom' && (!filters.from || !filters.to);

  const { data: report, isLoading, isError, error } = useReportQuery(query, {
    skip: needsTeam || needsDates,
  });
  const [emailReport, { isLoading: emailing }] = useEmailReportMutation();

  const grouped = useMemo(() => {
    const g = Object.fromEntries(TASK_COLUMNS.map((c) => [c.key, []]));
    (report?.tasks || []).forEach((t) => g[t.status]?.push(t));
    return g;
  }, [report]);

  const canAct = !needsTeam && !needsDates;
  const onExport = async (fmt) => {
    try {
      await downloadReport(fmt, query);
    } catch {
      toast.error('Could not export the report');
    }
  };
  const onEmail = async () => {
    try {
      await emailReport(query).unwrap();
      toast.success('Report emailed to you');
    } catch (err) {
      toast.error(getApiErrorMessage(err));
    }
  };

  const s = report?.summary;
  const statusData = (report?.byStatus || [])
    .filter((d) => d.count > 0)
    .map((d) => ({ name: STATUS_LABEL[d.status], value: d.count, key: d.status }));

  const rangeLabel = report
    ? `${format(new Date(report.range.from), 'MMM d')} – ${format(new Date(report.range.to), 'MMM d, yyyy')}`
    : '';

  return (
    <>
      <PageMeta title="Reports" />
      <PageHeader
        title="Reports"
        description="Summaries of your team's work over time."
        actions={
          <div className="flex flex-wrap gap-2">
            <Button variant="secondary" onClick={() => onExport('csv')} disabled={!canAct}>
              <Download className="h-4 w-4" /> CSV
            </Button>
            <Button variant="secondary" onClick={() => onExport('pdf')} disabled={!canAct}>
              <FileText className="h-4 w-4" /> PDF
            </Button>
            <Button onClick={onEmail} isLoading={emailing} disabled={!canAct}>
              <Mail className="h-4 w-4" /> Email me
            </Button>
          </div>
        }
      />

      {/* Controls */}
      <Card className="mb-6 flex flex-wrap items-center gap-x-6 gap-y-3 p-3">
        <div className="flex flex-col gap-1.5">
          <span className="px-1 text-[11px] font-semibold uppercase tracking-wide text-gray-400">Range</span>
          <Segmented value={range} onChange={(v) => setFilter('range', v)} options={RANGE_OPTS} />
        </div>
        <div className="flex flex-col gap-1.5">
          <span className="px-1 text-[11px] font-semibold uppercase tracking-wide text-gray-400">Scope</span>
          <Segmented value={scope} onChange={(v) => setFilter('scope', v)} options={SCOPE_OPTS} />
        </div>
        {scope === 'team' && (
          <div className="flex flex-col gap-1.5">
            <span className="px-1 text-[11px] font-semibold uppercase tracking-wide text-gray-400">Team</span>
            <Select className="h-9 w-auto py-0" value={filters.teamId || ''} onChange={(e) => setFilter('teamId', e.target.value)}>
              <option value="">Select a team…</option>
              {teams.map((t) => (
                <option key={t.id} value={t.id}>{t.name}</option>
              ))}
            </Select>
          </div>
        )}
        {range === 'custom' && (
          <div className="flex flex-col gap-1.5">
            <span className="px-1 text-[11px] font-semibold uppercase tracking-wide text-gray-400">Dates</span>
            <div className="flex items-center gap-2">
              <input
                type="date"
                value={filters.from || ''}
                max={filters.to || undefined}
                onChange={(e) => setFilter('from', e.target.value)}
                className="h-9 rounded-lg border border-gray-200 bg-white px-2.5 text-sm shadow-xs focus:border-brand-500 focus:outline-none dark:border-white/10 dark:bg-gray-800/80"
                aria-label="From date"
              />
              <span className="text-gray-400">→</span>
              <input
                type="date"
                value={filters.to || ''}
                min={filters.from || undefined}
                onChange={(e) => setFilter('to', e.target.value)}
                className="h-9 rounded-lg border border-gray-200 bg-white px-2.5 text-sm shadow-xs focus:border-brand-500 focus:outline-none dark:border-white/10 dark:bg-gray-800/80"
                aria-label="To date"
              />
            </div>
          </div>
        )}
        {rangeLabel && (
          <span className="ml-auto inline-flex items-center gap-1.5 self-end text-sm text-gray-400">
            <CalendarRange className="h-4 w-4" /> {rangeLabel}
          </span>
        )}
      </Card>

      {needsTeam ? (
        <Card className="p-10 text-center text-sm text-gray-400">Choose a team to see its report.</Card>
      ) : needsDates ? (
        <Card className="p-10 text-center text-sm text-gray-400">Pick a start and end date for a custom report.</Card>
      ) : isLoading ? (
        <div className="space-y-6">
          <div className="grid grid-cols-2 gap-4 md:grid-cols-5">
            {Array.from({ length: 5 }).map((_, i) => (
              <Skeleton key={i} className="h-[74px]" />
            ))}
          </div>
          <Skeleton className="h-72 w-full" />
        </div>
      ) : isError ? (
        <Card className="p-10 text-center text-sm text-red-500">{getApiErrorMessage(error)}</Card>
      ) : (
        <div className="space-y-6">
          <div className="grid grid-cols-2 gap-4 md:grid-cols-5">
            <SummaryCard label="Total" value={s.total} icon={Layers} tint="bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-300" />
            <SummaryCard label="Completed" value={s.completed} icon={CheckCircle2} accent="text-emerald-600" tint="bg-emerald-50 text-emerald-600 dark:bg-emerald-500/15 dark:text-emerald-400" />
            <SummaryCard label="In progress" value={s.inProgress} icon={Timer} accent="text-brand-600" tint="bg-brand-50 text-brand-600 dark:bg-brand-500/15 dark:text-brand-300" />
            <SummaryCard label="Overdue" value={s.overdue} icon={AlertTriangle} accent="text-red-600" tint="bg-red-50 text-red-600 dark:bg-red-500/15 dark:text-red-400" />
            <SummaryCard label="Completion" value={`${s.completionRate}%`} icon={Target} tint="bg-info-50 text-info-600 dark:bg-info-500/15 dark:text-info-500" />
          </div>

          <div className="grid gap-6 lg:grid-cols-3">
            <ChartCard title="Tasks by status" empty={statusData.length === 0}>
              <ResponsiveContainer>
                <PieChart>
                  <Pie data={statusData} dataKey="value" nameKey="name" innerRadius={50} outerRadius={80} paddingAngle={2} stroke="none">
                    {statusData.map((d) => (
                      <Cell key={d.key} fill={STATUS_COLORS[d.key]} />
                    ))}
                  </Pie>
                  <Tooltip content={<ChartTooltip />} />
                </PieChart>
              </ResponsiveContainer>
            </ChartCard>

            <ChartCard title="Completion trend" empty={(report.completionTrend || []).length === 0}>
              <ResponsiveContainer>
                <AreaChart data={report.completionTrend}>
                  <defs>
                    <linearGradient id="grad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#6a4fe6" stopOpacity={0.35} />
                      <stop offset="95%" stopColor="#6a4fe6" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgb(0 0 0 / 0.06)" vertical={false} />
                  <XAxis dataKey="date" tickFormatter={(d) => format(new Date(d), 'MMM d')} fontSize={11} stroke="#a8a39d" tickLine={false} axisLine={false} />
                  <YAxis allowDecimals={false} fontSize={11} width={24} stroke="#a8a39d" tickLine={false} axisLine={false} />
                  <Tooltip content={<ChartTooltip />} />
                  <Area type="monotone" dataKey="count" name="Completed" stroke="#6a4fe6" fill="url(#grad)" strokeWidth={2.5} />
                </AreaChart>
              </ResponsiveContainer>
            </ChartCard>

            <ChartCard title="Workload by assignee" empty={(report.workloadByAssignee || []).length === 0}>
              <ResponsiveContainer>
                <BarChart data={report.workloadByAssignee} layout="vertical" margin={{ left: 10 }} barGap={2}>
                  <XAxis type="number" allowDecimals={false} fontSize={11} stroke="#a8a39d" tickLine={false} axisLine={false} />
                  <YAxis type="category" dataKey="assignee" width={80} fontSize={11} stroke="#a8a39d" tickLine={false} axisLine={false} />
                  <Tooltip content={<ChartTooltip />} cursor={{ fill: 'rgb(106 79 230 / 0.06)' }} />
                  <Bar dataKey="total" name="Total" fill="#dbd8fd" radius={[0, 5, 5, 0]} />
                  <Bar dataKey="completed" name="Completed" fill="#6a4fe6" radius={[0, 5, 5, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </ChartCard>
          </div>

          <Card className="overflow-hidden">
            <div className="border-b border-gray-200/70 px-5 py-3 text-sm font-semibold dark:border-white/10">
              Tasks ({report.tasks.length})
            </div>
            {report.tasks.length === 0 ? (
              <p className="px-5 py-10 text-center text-sm text-gray-400">No tasks created in this range.</p>
            ) : (
              <div className="divide-y divide-gray-200/70 dark:divide-white/10">
                {TASK_COLUMNS.filter((c) => grouped[c.key].length > 0).map((c) => (
                  <div key={c.key} className="px-5 py-3">
                    <div className="mb-2 flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-gray-400">
                      <span className="h-2 w-2 rounded-full" style={{ backgroundColor: STATUS_COLORS[c.key] }} />
                      {c.label} · {grouped[c.key].length}
                    </div>
                    <ul className="space-y-1.5">
                      {grouped[c.key].map((t) => (
                        <li key={t.id} className="flex flex-wrap items-center justify-between gap-2 text-sm">
                          <span className="font-medium text-gray-800 dark:text-gray-200">{t.title}</span>
                          <span className="flex items-center gap-3 text-xs text-gray-400">
                            <PriorityBadge priority={t.priority} />
                            <span>{t.assignee}</span>
                            {t.dueDate && <span>due {format(new Date(t.dueDate), 'MMM d')}</span>}
                          </span>
                        </li>
                      ))}
                    </ul>
                  </div>
                ))}
              </div>
            )}
          </Card>
        </div>
      )}
    </>
  );
}
