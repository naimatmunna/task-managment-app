import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { formatDistanceToNow } from 'date-fns';
import toast from 'react-hot-toast';
import { X, Trash2, Send } from 'lucide-react';
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

  return createPortal(
    <AnimatePresence>
      {open && (
        <motion.div
          className="fixed inset-0 z-50 flex justify-end bg-black/30"
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
            <header className="flex items-center justify-between border-b border-black/5 px-5 py-3 dark:border-white/10">
              <span className="text-sm font-medium text-gray-400">Task details</span>
              <div className="flex items-center gap-1">
                <button onClick={onDelete} className="rounded-md p-1.5 text-gray-400 hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-900/20" aria-label="Delete">
                  <Trash2 className="h-4 w-4" />
                </button>
                <button onClick={onClose} className="rounded-md p-1.5 text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800" aria-label="Close">
                  <X className="h-5 w-5" />
                </button>
              </div>
            </header>

            {isLoading || !task ? (
              <div className="flex flex-1 items-center justify-center">
                <Spinner />
              </div>
            ) : (
              <div className="flex-1 space-y-5 overflow-y-auto px-5 py-4">
                <input
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  onBlur={() => title.trim() && title !== task.title && patch({ title: title.trim() })}
                  className="w-full rounded-md border border-transparent bg-transparent text-lg font-semibold text-gray-900 hover:border-gray-200 focus:border-brand-500 focus:outline-none dark:text-gray-100 dark:hover:border-gray-700"
                />

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
                    value={labels}
                    onChange={(e) => setLabels(e.target.value)}
                    onBlur={() => patch({ labels: labels.split(',').map((l) => l.trim()).filter(Boolean) })}
                  />
                </div>

                <div>
                  <span className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">Description</span>
                  <textarea
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    onBlur={() => description !== (task.description || '') && patch({ description })}
                    rows={4}
                    placeholder="Add more detail…"
                    className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500 dark:border-gray-700 dark:bg-gray-800"
                  />
                </div>

                <div>
                  <span className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">Activity</span>
                  <ul className="space-y-3">
                    {[...(task.activity || [])].reverse().map((a, i) => {
                      const actor = memberById[String(a.actorId)];
                      return (
                        <li key={i} className="flex gap-2.5 text-sm">
                          <Avatar name={actor?.name || '?'} size="xs" className="mt-0.5" />
                          <div className="min-w-0">
                            <p className="text-gray-700 dark:text-gray-300">
                              <span className="font-medium">{actor?.name || 'Someone'}</span>{' '}
                              {a.type === 'commented' ? (
                                <span className="text-gray-600 dark:text-gray-400">— {a.message}</span>
                              ) : (
                                a.message
                              )}
                            </p>
                            <span className="text-xs text-gray-400">
                              {a.createdAt ? formatDistanceToNow(new Date(a.createdAt), { addSuffix: true }) : ''}
                            </span>
                          </div>
                        </li>
                      );
                    })}
                  </ul>
                </div>
              </div>
            )}

            {task && (
              <form onSubmit={onComment} className="flex items-center gap-2 border-t border-black/5 p-3 dark:border-white/10">
                <input
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  placeholder="Write a comment…"
                  className="flex-1 rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500 dark:border-gray-700 dark:bg-gray-800"
                />
                <button
                  type="submit"
                  disabled={commenting || !message.trim()}
                  className={cn('rounded-lg bg-brand-600 p-2 text-white transition hover:bg-brand-700 disabled:opacity-50')}
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
