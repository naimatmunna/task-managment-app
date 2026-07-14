import { useEffect, useRef, useState } from 'react';
import { format } from 'date-fns';
import toast from 'react-hot-toast';
import { useCreateTaskMutation } from '@/features/tasks/taskApi.js';
import { useDirectory } from '@/hooks/useDirectory.js';
import { useAuth } from '@/hooks/useAuth.js';
import { useOrg } from '@/hooks/useOrg.js';
import { useTaskDraft } from '@/hooks/useTaskDraft.js';
import { getApiErrorMessage } from '@/helpers/apiError.js';
import { TASK_COLUMNS, TASK_PRIORITY } from '@/constants';
import Modal from '@/components/ui/Modal.jsx';
import Input from '@/components/ui/Input.jsx';
import Select from '@/components/ui/Select.jsx';
import Button from '@/components/ui/Button.jsx';
import DatePicker from '@/components/ui/DatePicker.jsx';
import ConfirmDialog from '@/components/ui/ConfirmDialog.jsx';

/** Quick-add / create-task modal. `defaultStatus` seeds the column it opens from. */
export default function TaskFormModal({ open, onClose, defaultStatus = 'todo' }) {
  const { members, teams } = useDirectory();
  const { user } = useAuth();
  const { orgId } = useOrg();
  const [create, { isLoading }] = useCreateTaskMutation();
  const draft = useTaskDraft({ userId: user?.id, orgId });

  // Lazy initializer so the form always opens clean. `status` is seeded from the
  // column it opened on, and the due date defaults to today (yyyy-MM-dd — the
  // shape DatePicker expects); the user can clear or change it.
  const [form, setForm] = useState(() => ({
    title: '',
    description: '',
    status: defaultStatus,
    priority: TASK_PRIORITY.MEDIUM,
    assigneeId: '',
    teamId: '',
    dueDate: format(new Date(), 'yyyy-MM-dd'),
    labels: '',
  }));
  const [confirmDiscard, setConfirmDiscard] = useState(false);

  // Pristine baseline captured once — the form is "dirty" if it differs from it.
  const pristine = useRef(null);
  if (pristine.current === null) pristine.current = JSON.stringify(form);
  const dirty = JSON.stringify(form) !== pristine.current;

  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

  // Restore a saved draft once, on open. Only apply/announce it if it actually
  // differs from the clean baseline (so an untouched form never "restores").
  useEffect(() => {
    const saved = draft.restore();
    if (saved && JSON.stringify({ ...JSON.parse(pristine.current), ...saved }) !== pristine.current) {
      setForm((f) => ({ ...f, ...saved }));
      toast.success('Your unsaved task draft has been restored.');
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Autosave (debounced inside the hook) whenever there's real, unsaved content.
  useEffect(() => {
    if (dirty) draft.save(form);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [form]);

  const requestClose = () => (dirty ? setConfirmDiscard(true) : onClose());

  const discardAndClose = () => {
    draft.clear();
    setConfirmDiscard(false);
    onClose();
  };

  const onSubmit = async (e) => {
    e.preventDefault();
    if (isLoading) return undefined; // guard against double-submit
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
      draft.clear(); // only clear after confirmed success
      toast.success('Task created');
      onClose();
    } catch (err) {
      // Keep the draft on failure so the user doesn't lose their work.
      toast.error(getApiErrorMessage(err));
    }
    return undefined;
  };

  return (
    <>
      <Modal open={open} onClose={requestClose} title="New task">
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
            <Button type="button" variant="secondary" onClick={requestClose}>
              Cancel
            </Button>
            <Button type="submit" isLoading={isLoading}>
              Create task
            </Button>
          </div>
        </form>
      </Modal>

      <ConfirmDialog
        open={confirmDiscard}
        onClose={() => setConfirmDiscard(false)}
        onConfirm={discardAndClose}
        title="Discard unsaved changes?"
        message="You have unsaved changes. Are you sure you want to discard them?"
        confirmLabel="Discard changes"
      />
    </>
  );
}
