import { useParams, useNavigate, Link } from 'react-router-dom';
import { format } from 'date-fns';
import toast from 'react-hot-toast';
import { ArrowLeft, Trash2, Activity as ActivityIcon, MessageSquare, FileText, SlidersHorizontal } from 'lucide-react';
import { useTaskQuery, useDeleteTaskMutation } from '@/features/tasks/taskApi.js';
import { useDirectory } from '@/hooks/useDirectory.js';
import { getApiErrorMessage } from '@/helpers/apiError.js';
import { ROUTES, STATUS_META } from '@/constants';
import PageMeta from '@/components/common/PageMeta.jsx';
import Card from '@/components/ui/Card.jsx';
import Spinner from '@/components/ui/Spinner.jsx';
import Avatar from '@/components/ui/Avatar.jsx';
import PriorityBadge from '@/components/tasks/PriorityBadge.jsx';
import {
  PRIORITY_DOT,
  TitleEditor,
  PropertiesGrid,
  DescriptionEditor,
  ChecklistSection,
  AttachmentsSection,
  CommentsList,
  ActivityFeed,
  CommentComposer,
} from '@/components/tasks/detail/sections.jsx';
import { cn } from '@/lib/classNames.js';

/** A titled card block used across the detail page. */
function Panel({ title, icon: Icon, action, children, className }) {
  return (
    <Card className={cn('p-5', className)}>
      {title && (
        <div className="mb-3 flex items-center justify-between">
          <h3 className="flex items-center gap-1.5 text-sm font-semibold text-gray-900 dark:text-gray-100">
            {Icon && <Icon className="h-4 w-4 text-gray-400" />} {title}
          </h3>
          {action}
        </div>
      )}
      {children}
    </Card>
  );
}

export default function TaskDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { data: task, isLoading, isError } = useTaskQuery(id, { skip: !id });
  const { memberById } = useDirectory();
  const [deleteTask] = useDeleteTaskMutation();

  const onDelete = async () => {
    if (!window.confirm('Delete this task?')) return;
    try {
      await deleteTask(id).unwrap();
      toast.success('Task deleted');
      navigate(ROUTES.BOARD);
    } catch (err) {
      toast.error(getApiErrorMessage(err));
    }
  };

  if (isLoading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <Spinner />
      </div>
    );
  }

  if (isError || !task) {
    return (
      <Card className="mx-auto max-w-md p-10 text-center">
        <p className="text-sm text-gray-500 dark:text-gray-400">This task doesn&apos;t exist or you don&apos;t have access to it.</p>
        <Link to={ROUTES.BOARD} className="mt-4 inline-flex items-center gap-1.5 text-sm font-medium text-brand-600 hover:underline">
          <ArrowLeft className="h-4 w-4" /> Back to board
        </Link>
      </Card>
    );
  }

  const status = STATUS_META[task.status];
  const creator = memberById[String(task.createdById)];

  return (
    <>
      <PageMeta title={task.title} />

      <div className="mb-4 flex items-center justify-between">
        <button
          onClick={() => (window.history.length > 1 ? navigate(-1) : navigate(ROUTES.BOARD))}
          className="inline-flex items-center gap-1.5 text-sm font-medium text-gray-500 transition hover:text-gray-900 dark:text-gray-400 dark:hover:text-gray-100"
        >
          <ArrowLeft className="h-4 w-4" /> Back
        </button>
        <button
          onClick={onDelete}
          className="inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-sm font-medium text-gray-500 transition hover:bg-danger-50 hover:text-danger-600 dark:text-gray-400 dark:hover:bg-danger-900/20"
        >
          <Trash2 className="h-4 w-4" /> Delete
        </button>
      </div>

      {/* Title / meta header */}
      <Card className="mb-6 p-5">
        <div className="flex items-start gap-3">
          <span className={cn('mt-2.5 h-2.5 w-2.5 shrink-0 rounded-full', PRIORITY_DOT[task.priority] || PRIORITY_DOT.low)} />
          <div className="min-w-0 flex-1">
            <TitleEditor task={task} className="text-2xl" />
            <div className="mt-2 flex flex-wrap items-center gap-2 px-2 text-xs text-gray-400">
              {status && <span className={cn('rounded-full px-2 py-0.5 text-[11px] font-medium', status.chip)}>{status.label}</span>}
              <PriorityBadge priority={task.priority} />
              {task.dueDate && <span>· due {format(new Date(task.dueDate), 'MMM d, yyyy')}</span>}
              {creator && <span>· created by {creator.name}</span>}
              {task.createdAt && <span>· {format(new Date(task.createdAt), 'MMM d, yyyy')}</span>}
            </div>
          </div>
        </div>
      </Card>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Main column */}
        <div className="space-y-6 lg:col-span-2">
          <Panel title="Description" icon={FileText}>
            <DescriptionEditor task={task} />
          </Panel>

          <Card className="p-5">
            <ChecklistSection task={task} />
          </Card>

          <Card className="p-5">
            <AttachmentsSection task={task} />
          </Card>

          <Panel title="Comments" icon={MessageSquare}>
            <CommentsList task={task} />
            <div className="mt-4 border-t border-black/5 pt-4 dark:border-white/10">
              <CommentComposer task={task} />
            </div>
          </Panel>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          <Panel title="Details" icon={SlidersHorizontal}>
            <PropertiesGrid task={task} cols={1} />
            {task.assigneeId && (
              <div className="mt-4 flex items-center gap-2 border-t border-black/5 pt-4 text-sm dark:border-white/10">
                <Avatar name={task.assigneeId.name} src={task.assigneeId.avatar?.url} size="sm" />
                <div>
                  <p className="text-xs text-gray-400">Assignee</p>
                  <p className="font-medium text-gray-700 dark:text-gray-200">{task.assigneeId.name}</p>
                </div>
              </div>
            )}
          </Panel>

          <Panel title="Activity" icon={ActivityIcon}>
            <ActivityFeed task={task} />
          </Panel>
        </div>
      </div>
    </>
  );
}
