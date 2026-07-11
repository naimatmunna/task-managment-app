import { useState } from 'react';
import { format, isPast, isToday } from 'date-fns';
import { Plus, ArrowUpDown, Download } from 'lucide-react';
import { useTaskListQuery } from '@/features/tasks/taskApi.js';
import { toApiFilters } from '@/features/tasks/taskQuery.js';
import { useTaskFilters } from '@/hooks/useTaskFilters.js';
import PageHeader from '@/components/app/PageHeader.jsx';
import PageMeta from '@/components/common/PageMeta.jsx';
import Card from '@/components/ui/Card.jsx';
import Button from '@/components/ui/Button.jsx';
import Avatar from '@/components/ui/Avatar.jsx';
import Skeleton from '@/components/ui/Skeleton.jsx';
import EmptyState from '@/components/ui/EmptyState.jsx';
import PriorityBadge from '@/components/tasks/PriorityBadge.jsx';
import StatusBadge from '@/components/tasks/StatusBadge.jsx';
import TaskFilters from '@/components/tasks/TaskFilters.jsx';
import TaskFormModal from '@/components/tasks/TaskFormModal.jsx';
import TaskDetailPanel from '@/components/tasks/TaskDetailPanel.jsx';
import ExportTasksModal from '@/components/tasks/ExportTasksModal.jsx';
import Pagination from '@/components/ui/Pagination.jsx';
import { List as ListIcon } from 'lucide-react';
import { cn } from '@/lib/classNames.js';

const HEADERS = [
  { key: 'title', label: 'Task', sortable: true },
  { key: 'assignee', label: 'Assignee', sortable: false },
  { key: 'status', label: 'Status', sortable: true },
  { key: 'priority', label: 'Priority', sortable: true },
  { key: 'team', label: 'Team', sortable: false },
  { key: 'dueDate', label: 'Due', sortable: true },
  { key: 'createdAt', label: 'Created', sortable: true },
];

export default function TasksList() {
  const { filters, setFilter, setFilters, clear, activeCount } = useTaskFilters();
  const { data, isLoading, isFetching } = useTaskListQuery(toApiFilters(filters));
  const [addOpen, setAddOpen] = useState(false);
  const [exportOpen, setExportOpen] = useState(false);
  const [openTaskId, setOpenTaskId] = useState(null);

  const tasks = data?.tasks || [];
  const pagination = data?.meta?.pagination;

  const toggleSort = (key) => {
    const cur = filters.sort;
    setFilter('sort', cur === key ? `-${key}` : cur === `-${key}` ? '' : key);
  };

  return (
    <>
      <PageMeta title="List" />
      <PageHeader
        title="Tasks"
        description="A dense, sortable view of every task."
        actions={
          <div className="flex gap-2">
            <Button variant="secondary" onClick={() => setExportOpen(true)}>
              <Download className="h-4 w-4" /> Export
            </Button>
            <Button onClick={() => setAddOpen(true)}>
              <Plus className="h-4 w-4" /> New task
            </Button>
          </div>
        }
      />
      <TaskFilters
        filters={filters}
        setFilter={setFilter}
        setFilters={setFilters}
        clear={clear}
        activeCount={activeCount}
        showStatus
        resultCount={pagination?.total}
      />

      <Card className="overflow-hidden">
        {isLoading ? (
          <div className="space-y-2 p-4">
            {Array.from({ length: 6 }).map((_, i) => (
              <Skeleton key={i} className="h-10 w-full" />
            ))}
          </div>
        ) : tasks.length === 0 ? (
          <EmptyState
            icon={ListIcon}
            title="No tasks match"
            description={activeCount ? 'Try adjusting or clearing your filters.' : 'Create your first task to get started.'}
            action={<Button onClick={() => setAddOpen(true)}><Plus className="h-4 w-4" /> New task</Button>}
          />
        ) : (
          <div className={cn('max-h-[calc(100vh-16rem)] overflow-auto transition-opacity', isFetching && 'opacity-60')}>
            <table className="w-full text-sm tabular-nums">
              <thead className="sticky top-0 z-10 border-b border-gray-200/70 bg-white text-left text-xs uppercase tracking-wide text-gray-400 [&_th]:bg-white dark:border-white/10 dark:bg-gray-900 dark:[&_th]:bg-gray-900">
                <tr>
                  {HEADERS.map((h) => (
                    <th key={h.key} className="px-4 py-3 font-medium">
                      {h.sortable ? (
                        <button onClick={() => toggleSort(h.key)} className="inline-flex items-center gap-1 hover:text-gray-600 dark:hover:text-gray-200">
                          {h.label}
                          <ArrowUpDown className="h-3 w-3" />
                        </button>
                      ) : (
                        h.label
                      )}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-black/5 dark:divide-white/10">
                {tasks.map((t) => {
                  const due = t.dueDate ? new Date(t.dueDate) : null;
                  const overdue = due && t.status !== 'done' && isPast(due) && !isToday(due);
                  return (
                    <tr
                      key={t.id}
                      onClick={() => setOpenTaskId(t.id)}
                      className="cursor-pointer hover:bg-gray-50/70 dark:hover:bg-gray-800/40"
                    >
                      <td className="max-w-xs px-4 py-3">
                        <span className="block truncate font-medium text-gray-900 dark:text-gray-100">{t.title}</span>
                      </td>
                      <td className="px-4 py-3">
                        {t.assigneeId ? (
                          <span className="flex items-center gap-2">
                            <Avatar name={t.assigneeId.name} src={t.assigneeId.avatar?.url} size="xs" />
                            <span className="text-gray-600 dark:text-gray-300">{t.assigneeId.name}</span>
                          </span>
                        ) : (
                          <span className="text-gray-400">—</span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <StatusBadge status={t.status} />
                      </td>
                      <td className="px-4 py-3">
                        <PriorityBadge priority={t.priority} />
                      </td>
                      <td className="px-4 py-3">
                        {t.teamId ? (
                          <span className="flex items-center gap-1.5 text-gray-600 dark:text-gray-300">
                            <span className="h-2 w-2 rounded-full" style={{ backgroundColor: t.teamId.color }} />
                            {t.teamId.name}
                          </span>
                        ) : (
                          <span className="text-gray-400">—</span>
                        )}
                      </td>
                      <td className={cn('px-4 py-3', overdue ? 'font-medium text-red-600' : 'text-gray-500')}>
                        {due ? format(due, 'MMM d, yyyy') : '—'}
                      </td>
                      <td className="px-4 py-3 text-gray-500">{format(new Date(t.createdAt), 'MMM d')}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {pagination && (
        <Pagination
          page={pagination.page}
          pageSize={Number(filters.limit) || 25}
          total={pagination.total}
          totalPages={pagination.totalPages}
          onChange={(p) => setFilter('page', String(p))}
          onPageSizeChange={(n) => setFilter('limit', String(n))}
          label="tasks"
        />
      )}

      {addOpen && <TaskFormModal open onClose={() => setAddOpen(false)} />}
      {exportOpen && <ExportTasksModal open onClose={() => setExportOpen(false)} />}
      <TaskDetailPanel taskId={openTaskId} onClose={() => setOpenTaskId(null)} />
    </>
  );
}
