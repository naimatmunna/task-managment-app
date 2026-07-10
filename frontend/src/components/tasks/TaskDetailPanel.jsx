import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { formatDistanceToNow } from 'date-fns';
import toast from 'react-hot-toast';
import { X, Trash2, Send, MessageSquare, Activity as ActivityIcon } from 'lucide-react';
import {
  useTaskQuery,
  useUpdateTaskMutation,
  useCommentTaskMutation,
  useDeleteTaskMutation,
} from '@/features/tasks/taskApi.js';
import { useDirectory } from '@/hooks/useDirectory.js';
import { getApiErrorMessage } from '@/helpers/apiError.js';
import { TASK_COLUMNS, TASK_PRIORITY } from '@/constants';
import Select from '@/components/ui/Select.jsx';
import Input from '@/components/ui/Input.jsx';
import DatePicker from '@/components/ui/DatePicker.jsx';
import Avatar from '@/components/ui/Avatar.jsx';
import Spinner from '@/components/ui/Spinner.jsx';
import { cn } from '@/lib/classNames.js';

const toDateInput = (iso) => (iso ? new Date(iso).toISOString().slice(0, 10) : '');

const PRIORITY_DOT = {
  urgent: 'bg-danger-500',
  high: 'bg-orange-500',
  medium: 'bg-amber-400',
  low: 'bg-gray-300 dark:bg-gray-600',
};

/** A titled section wrapper for consistent rhythm inside the drawer body. */
function Section({ title, icon: Icon, children }) {
  return (
    <section>
      {title && (
        <div className="mb-2 flex items-center gap-1.5">
          {Icon && <Icon className="h-3.5 w-3.5 text-gray-400" />}
          <span className="text-xs font-semibold uppercase tracking-wide text-gray-400">{title}</span>
        </div>
      )}
      {children}
    </section>
  );
}

export default function TaskDetailPanel({ taskId, onClose }) {
  const open = Boolean(taskId);
  const { data: task, isLoading } = useTaskQuery(taskId, { skip: !taskId });
  const { members, teams, memberById } = useDirectory();
  const [update] = useUpdateTaskMutation();
  const [comment, { isLoading: commenting }] = useCommentTaskMutation();
  const [deleteTask] = useDeleteTaskMutation();

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [labels, setLabels] = useState('');
  const [message, setMessage] = useState('');

  useEffect(() => {
    if (task) {
      setTitle(task.title);
      setDescription(task.description || '');
      setLabels((task.labels || []).join(', '));
    }
  }, [task]);

  const patch = async (body) => {
    try {
      await update({ id: taskId, ...body }).unwrap();
    } catch (err) {
      toast.error(getApiErrorMessage(err));
    }
  };

  const assigneeId = task?.assigneeId?.id || task?.assigneeId || '';
  const teamId = task?.teamId?.id || task?.teamId || '';

  const onComment = async (e) => {
    e.preventDefault();
    if (!message.trim()) return;
    try {
      await comment({ id: taskId, message: message.trim() }).unwrap();
      setMessage('');
    } catch (err) {
      toast.error(getApiErrorMessage(err));
    }
  };

  const onDelete = async () => {
    if (!window.confirm('Delete this task?')) return;
    try {
      await deleteTask(taskId).unwrap();
      toast.success('Task deleted');
      onClose();
    } catch (err) {
      toast.error(getApiErrorMessage(err));
    }
  };

  const commentCount = (task?.activity || []).filter((a) => a.type === 'commented').length;

  return createPortal(
    <AnimatePresence>
      {open && (
        <motion.div
          className="fixed inset-0 z-50 flex justify-end bg-black/40 backdrop-blur-[2px]"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
        >
          <motion.aside
            className="flex h-full w-full max-w-md flex-col bg-white shadow-pop dark:bg-gray-900"
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'tween', duration: 0.22 }}
            onClick={(e) => e.stopPropagation()}
          >
            <header className="flex items-center justify-between border-b border-black/5 px-5 py-3.5 dark:border-white/10">
              <div className="flex items-center gap-2">
                <span className={cn('h-2 w-2 rounded-full', PRIORITY_DOT[task?.priority] || PRIORITY_DOT.low)} />
                <span className="text-sm font-medium text-gray-500 dark:text-gray-400">Task details</span>
              </div>
              <div className="flex items-center gap-1">
                <button
                  onClick={onDelete}
                  className="rounded-lg p-1.5 text-gray-400 transition hover:bg-danger-50 hover:text-danger-600 dark:hover:bg-danger-900/20"
                  aria-label="Delete"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
                <button
                  onClick={onClose}
                  className="rounded-lg p-1.5 text-gray-400 transition hover:bg-gray-100 hover:text-gray-600 dark:hover:bg-gray-800 dark:hover:text-gray-200"
                  aria-label="Close"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
            </header>

            {isLoading || !task ? (
              <div className="flex flex-1 items-center justify-center">
                <Spinner />
              </div>
            ) : (
              <div className="flex-1 space-y-6 overflow-y-auto px-5 py-5">
                <textarea
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  onBlur={() => title.trim() && title !== task.title && patch({ title: title.trim() })}
                  rows={1}
                  onInput={(e) => {
                    e.target.style.height = 'auto';
                    e.target.style.height = `${e.target.scrollHeight}px`;
                  }}
                  className="w-full resize-none rounded-lg border border-transparent bg-transparent px-2 py-1 text-lg font-semibold leading-snug text-gray-900 transition hover:border-gray-200 focus:border-brand-500 focus:bg-white focus:outline-none focus:ring-4 focus:ring-brand-500/10 dark:text-gray-100 dark:hover:border-white/10 dark:focus:bg-gray-800/60"
                />

                <Section title="Properties">
                  <div className="grid grid-cols-2 gap-3">
                    <Select label="Status" value={task.status} onChange={(e) => patch({ status: e.target.value })}>
                      {TASK_COLUMNS.map((c) => (
                        <option key={c.key} value={c.key}>{c.label}</option>
                      ))}
                    </Select>
                    <Select label="Priority" value={task.priority} onChange={(e) => patch({ priority: e.target.value })}>
                      {Object.values(TASK_PRIORITY).map((p) => (
                        <option key={p} value={p} className="capitalize">{p}</option>
                      ))}
                    </Select>
                    <Select label="Assignee" value={assigneeId} onChange={(e) => patch({ assigneeId: e.target.value || null })}>
                      <option value="">Unassigned</option>
                      {members.map((m) => (
                        <option key={m.id} value={m.id}>{m.name}</option>
                      ))}
                    </Select>
                    <Select label="Team" value={teamId} onChange={(e) => patch({ teamId: e.target.value || null })}>
                      <option value="">No team</option>
                      {teams.map((t) => (
                        <option key={t.id} value={t.id}>{t.name}</option>
                      ))}
                    </Select>
                    <DatePicker
                      label="Due date"
                      placeholder="No due date"
                      value={toDateInput(task.dueDate)}
                      onChange={(v) => patch({ dueDate: v ? new Date(v).toISOString() : null })}
                    />
                    <Input
                      label="Labels"
                      placeholder="design, api…"
                      value={labels}
                      onChange={(e) => setLabels(e.target.value)}
                      onBlur={() => patch({ labels: labels.split(',').map((l) => l.trim()).filter(Boolean) })}
                    />
                  </div>
                </Section>

                <Section title="Description">
                  <textarea
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    onBlur={() => description !== (task.description || '') && patch({ description })}
                    rows={4}
                    placeholder="Add more detail…"
                    className="w-full rounded-xl border border-gray-200 bg-white px-3.5 py-2.5 text-sm text-gray-900 shadow-xs transition placeholder:text-gray-400 focus:border-brand-500 focus:outline-none focus:ring-4 focus:ring-brand-500/12 dark:border-white/10 dark:bg-gray-800/80 dark:text-gray-100 dark:placeholder:text-gray-500"
                  />
                </Section>

                <Section title={`Activity${commentCount ? ` · ${commentCount} comment${commentCount > 1 ? 's' : ''}` : ''}`} icon={ActivityIcon}>
                  {(task.activity || []).length === 0 ? (
                    <p className="text-sm text-gray-400">No activity yet.</p>
                  ) : (
                    <ul className="space-y-3.5">
                      {[...(task.activity || [])].reverse().map((a, i) => {
                        const actor = memberById[String(a.actorId)];
                        const isComment = a.type === 'commented';
                        return (
                          <li key={i} className="flex gap-2.5 text-sm">
                            <Avatar name={actor?.name || '?'} size="xs" className="mt-0.5 shrink-0" />
                            <div className="min-w-0 flex-1">
                              {isComment ? (
                                <div className="rounded-xl rounded-tl-sm bg-gray-50 px-3 py-2 dark:bg-gray-800/70">
                                  <p className="mb-0.5 text-xs font-medium text-gray-700 dark:text-gray-300">
                                    {actor?.name || 'Someone'}
                                  </p>
                                  <p className="whitespace-pre-wrap break-words text-gray-700 dark:text-gray-300">{a.message}</p>
                                </div>
                              ) : (
                                <p className="pt-0.5 text-gray-600 dark:text-gray-400">
                                  <span className="font-medium text-gray-700 dark:text-gray-300">{actor?.name || 'Someone'}</span>{' '}
                                  {a.message}
                                </p>
                              )}
                              <span className="ml-0.5 mt-1 block text-xs text-gray-400">
                                {a.createdAt ? formatDistanceToNow(new Date(a.createdAt), { addSuffix: true }) : ''}
                              </span>
                            </div>
                          </li>
                        );
                      })}
                    </ul>
                  )}
                </Section>
              </div>
            )}

            {task && (
              <form
                onSubmit={onComment}
                className="flex items-center gap-2 border-t border-black/5 bg-white/70 p-3 backdrop-blur dark:border-white/10 dark:bg-gray-900/70"
              >
                <div className="relative flex-1">
                  <MessageSquare className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                  <input
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    placeholder="Write a comment…"
                    className="w-full rounded-xl border border-gray-200 bg-white py-2 pl-9 pr-3 text-sm text-gray-900 shadow-xs transition placeholder:text-gray-400 focus:border-brand-500 focus:outline-none focus:ring-4 focus:ring-brand-500/12 dark:border-white/10 dark:bg-gray-800/80 dark:text-gray-100 dark:placeholder:text-gray-500"
                  />
                </div>
                <button
                  type="submit"
                  disabled={commenting || !message.trim()}
                  className="rounded-xl bg-brand-600 p-2.5 text-white transition hover:bg-brand-700 disabled:cursor-not-allowed disabled:opacity-40"
                  aria-label="Send comment"
                >
                  <Send className="h-4 w-4" />
                </button>
              </form>
            )}
          </motion.aside>
        </motion.div>
      )}
    </AnimatePresence>,
    document.body,
  );
}
