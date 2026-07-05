import { format, isPast, isToday } from 'date-fns';
import { Calendar, MessageSquare } from 'lucide-react';
import PriorityBadge from './PriorityBadge.jsx';
import Avatar from '@/components/ui/Avatar.jsx';
import { cn } from '@/lib/classNames.js';

/** Compact presentational card used on the board (and drag overlay). */
export default function TaskCard({ task, assignee, team, onClick, dragging = false }) {
  const due = task.dueDate ? new Date(task.dueDate) : null;
  const overdue = due && task.status !== 'done' && isPast(due) && !isToday(due);
  const comments = (task.activity || []).filter((a) => a.type === 'commented').length;

  return (
    <div
      onClick={onClick}
      className={cn(
        'group cursor-pointer select-none rounded-xl border border-gray-200/70 bg-white p-3 shadow-soft transition-all duration-150 ease-smooth',
        'hover:-translate-y-0.5 hover:border-brand-300/60 hover:shadow-card dark:border-white/10 dark:bg-gray-900 dark:hover:border-brand-500/40',
        dragging && 'rotate-2 scale-[1.02] shadow-pop',
      )}
    >
      <div className="mb-2 flex items-start justify-between gap-2">
        <p className="text-sm font-medium leading-snug text-gray-900 dark:text-gray-100">{task.title}</p>
      </div>

      {team && (
        <span className="mb-2 inline-flex items-center gap-1.5 text-xs text-gray-500">
          <span className="h-2 w-2 rounded-full" style={{ backgroundColor: team.color }} />
          {team.name}
        </span>
      )}

      {task.labels?.length > 0 && (
        <div className="mb-2 flex flex-wrap gap-1">
          {task.labels.slice(0, 3).map((l) => (
            <span key={l} className="rounded bg-gray-100 px-1.5 py-0.5 text-[11px] text-gray-500 dark:bg-gray-800 dark:text-gray-400">
              {l}
            </span>
          ))}
        </div>
      )}

      <div className="flex items-center justify-between">
        <PriorityBadge priority={task.priority} />
        <div className="flex items-center gap-2">
          {comments > 0 && (
            <span className="flex items-center gap-0.5 text-xs text-gray-400">
              <MessageSquare className="h-3.5 w-3.5" /> {comments}
            </span>
          )}
          {due && (
            <span className={cn('flex items-center gap-0.5 text-xs', overdue ? 'text-red-600' : 'text-gray-400')}>
              <Calendar className="h-3.5 w-3.5" /> {format(due, 'MMM d')}
            </span>
          )}
          {assignee && <Avatar name={assignee.name} src={assignee.avatar} size="xs" />}
        </div>
      </div>
    </div>
  );
}
