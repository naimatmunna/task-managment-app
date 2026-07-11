import { useState } from 'react';
import toast from 'react-hot-toast';
import { useCreateTaskMutation } from '@/features/tasks/taskApi.js';
import { useDirectory } from '@/hooks/useDirectory.js';
import { getApiErrorMessage } from '@/helpers/apiError.js';
import { TASK_COLUMNS, TASK_PRIORITY } from '@/constants';
import Modal from '@/components/ui/Modal.jsx';
import Input from '@/components/ui/Input.jsx';
import Select from '@/components/ui/Select.jsx';
import Button from '@/components/ui/Button.jsx';
import DatePicker from '@/components/ui/DatePicker.jsx';

/** Quick-add / create-task modal. `defaultStatus` seeds the column it opens from. */
export default function TaskFormModal({ open, onClose, defaultStatus = 'todo' }) {
  const { members, teams } = useDirectory();
  const [create, { isLoading }] = useCreateTaskMutation();

  // Lazy initializer so the form always opens clean. Only `status` is seeded
  // (from the column it opened on); assignee, team and due date stay empty —
  // a new task should not silently inherit today's date or the first team.
  const [form, setForm] = useState(() => ({
    title: '',
    description: '',
    status: defaultStatus,
    priority: TASK_PRIORITY.MEDIUM,
    assigneeId: '',
    teamId: '',
    dueDate: '',
    labels: '',
  }));
  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

  const onSubmit = async (e) => {
    e.preventDefault();
    if (!form.title.trim()) return toast.error('Title is required');
    const body = {
      title: form.title.trim(),
      description: form.description,
      status: form.status,
      priority: form.priority,
      assigneeId: form.assigneeId || null,
      teamId: form.teamId || null,
      dueDate: form.dueDate ? new Date(form.dueDate).toISOString() : null,
      labels: form.labels.split(',').map((l) => l.trim()).filter(Boolean),
    };
    try {
      await create(body).unwrap();
      toast.success('Task created');
      onClose();
    } catch (err) {
      toast.error(getApiErrorMessage(err));
    }
    return undefined;
  };

  return (
    <Modal open={open} onClose={onClose} title="New task">
      {/* autoComplete off so the browser doesn't autofill the Team/Assignee
          selects or any field with stale values. */}
      <form onSubmit={onSubmit} className="space-y-3" autoComplete="off">
        <Input autoFocus placeholder="Task title" value={form.title} onChange={set('title')} />
        <textarea
          placeholder="Description (optional)"
          value={form.description}
          onChange={set('description')}
          rows={3}
          className="w-full rounded-xl border border-gray-200 bg-white px-3.5 py-2.5 text-sm text-gray-900 shadow-xs transition placeholder:text-gray-400 focus:border-brand-500 focus:outline-none focus:ring-4 focus:ring-brand-500/12 dark:border-white/10 dark:bg-gray-800/80 dark:text-gray-100 dark:placeholder:text-gray-500"
        />
        <div className="grid grid-cols-2 gap-3">
          <Select label="Status" value={form.status} onChange={set('status')}>
            {TASK_COLUMNS.map((c) => (
              <option key={c.key} value={c.key}>
                {c.label}
              </option>
            ))}
          </Select>
          <Select label="Priority" value={form.priority} onChange={set('priority')}>
            {Object.values(TASK_PRIORITY).map((p) => (
              <option key={p} value={p} className="capitalize">
                {p}
              </option>
            ))}
          </Select>
          <Select label="Assignee" value={form.assigneeId} onChange={set('assigneeId')} autoComplete="off">
            <option value="">Unassigned</option>
            {members.map((m) => (
              <option key={m.id} value={m.id}>
                {m.name}
              </option>
            ))}
          </Select>
          <Select label="Team" value={form.teamId} onChange={set('teamId')} autoComplete="off">
            <option value="">No team</option>
            {teams.map((t) => (
              <option key={t.id} value={t.id}>
                {t.name}
              </option>
            ))}
          </Select>
          <DatePicker
            label="Due date"
            placeholder="No due date"
            value={form.dueDate}
            onChange={(v) => setForm((f) => ({ ...f, dueDate: v }))}
          />
          <Input label="Labels" placeholder="bug, ux" value={form.labels} onChange={set('labels')} />
        </div>
        <div className="flex justify-end gap-2 pt-2">
          <Button type="button" variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" isLoading={isLoading}>
            Create task
          </Button>
        </div>
      </form>
    </Modal>
  );
}
