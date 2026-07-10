import { useState, useRef, useMemo } from 'react';
import { formatDistanceToNow } from 'date-fns';
import toast from 'react-hot-toast';
import { Trash2, Send, Plus, Paperclip, Download, ListChecks, MessageSquare, X } from 'lucide-react';
import {
  useUpdateTaskMutation,
  useCommentTaskMutation,
  useAddSubtaskMutation,
  useUpdateSubtaskMutation,
  useDeleteSubtaskMutation,
  useAddAttachmentMutation,
  useDeleteAttachmentMutation,
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

export const PRIORITY_DOT = {
  urgent: 'bg-danger-500',
  high: 'bg-orange-500',
  medium: 'bg-amber-400',
  low: 'bg-gray-300 dark:bg-gray-600',
};

const toDateInput = (iso) => (iso ? new Date(iso).toISOString().slice(0, 10) : '');

export const formatBytes = (n) => {
  if (!n) return '';
  const kb = n / 1024;
  return kb < 1024 ? `${Math.max(1, Math.round(kb))} KB` : `${(kb / 1024).toFixed(1)} MB`;
};

/** Shared toast-wrapped mutation runner. */
const runner = (fn) => async (...args) => {
  try {
    await fn(...args).unwrap();
  } catch (err) {
    toast.error(getApiErrorMessage(err));
  }
};

/** A titled section with consistent rhythm and an optional right-aligned action. */
export function Section({ title, icon: Icon, action, children, className }) {
  return (
    <section className={className}>
      {title && (
        <div className="mb-2 flex items-center justify-between">
          <div className="flex items-center gap-1.5">
            {Icon && <Icon className="h-3.5 w-3.5 text-gray-400" />}
            <span className="text-xs font-semibold uppercase tracking-wide text-gray-400">{title}</span>
          </div>
          {action}
        </div>
      )}
      {children}
    </section>
  );
}

/** Auto-growing, inline-editable task title. Self-contained (owns its mutation). */
export function TitleEditor({ task, className }) {
  const [update] = useUpdateTaskMutation();
  const [title, setTitle] = useState(task.title);

  // Reset local state if a different task loads.
  const seen = useRef(task.id);
  if (seen.current !== task.id) {
    seen.current = task.id;
    setTitle(task.title);
  }

  const commit = async () => {
    const t = title.trim();
    if (!t || t === task.title) return;
    try {
      await update({ id: task.id, title: t }).unwrap();
    } catch (err) {
      toast.error(getApiErrorMessage(err));
    }
  };

  return (
    <textarea
      value={title}
      onChange={(e) => setTitle(e.target.value)}
      onBlur={commit}
      rows={1}
      onInput={(e) => {
        e.target.style.height = 'auto';
        e.target.style.height = `${e.target.scrollHeight}px`;
      }}
      className={cn(
        'w-full resize-none rounded-lg border border-transparent bg-transparent px-2 py-1 font-semibold leading-snug text-gray-900 transition hover:border-gray-200 focus:border-brand-500 focus:bg-white focus:outline-none focus:ring-4 focus:ring-brand-500/10 dark:text-gray-100 dark:hover:border-white/10 dark:focus:bg-gray-800/60',
        className || 'text-lg',
      )}
    />
  );
}

/** The status / priority / assignee / team / due / labels grid. */
export function PropertiesGrid({ task, cols = 2 }) {
  const { members, teams } = useDirectory();
  const [update] = useUpdateTaskMutation();
  const [labels, setLabels] = useState((task.labels || []).join(', '));

  const seen = useRef(task.id);
  if (seen.current !== task.id) {
    seen.current = task.id;
    setLabels((task.labels || []).join(', '));
  }

  const patch = runner((body) => update({ id: task.id, ...body }));
  const assigneeId = task.assigneeId?.id || task.assigneeId || '';
  const teamId = task.teamId?.id || task.teamId || '';

  return (
    <div className={cn('grid gap-3', cols === 1 ? 'grid-cols-1' : 'grid-cols-2')}>
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
  );
}

export function DescriptionEditor({ task }) {
  const [update] = useUpdateTaskMutation();
  const [description, setDescription] = useState(task.description || '');

  const seen = useRef(task.id);
  if (seen.current !== task.id) {
    seen.current = task.id;
    setDescription(task.description || '');
  }

  const commit = async () => {
    if (description === (task.description || '')) return;
    try {
      await update({ id: task.id, description }).unwrap();
    } catch (err) {
      toast.error(getApiErrorMessage(err));
    }
  };

  return (
    <textarea
      value={description}
      onChange={(e) => setDescription(e.target.value)}
      onBlur={commit}
      rows={4}
      placeholder="Add more detail…"
      className="w-full rounded-xl border border-gray-200 bg-white px-3.5 py-2.5 text-sm text-gray-900 shadow-xs transition placeholder:text-gray-400 focus:border-brand-500 focus:outline-none focus:ring-4 focus:ring-brand-500/12 dark:border-white/10 dark:bg-gray-800/80 dark:text-gray-100 dark:placeholder:text-gray-500"
    />
  );
}

/** Checklist with a completion bar and inline add. */
export function ChecklistSection({ task }) {
  const [addSubtask] = useAddSubtaskMutation();
  const [updateSubtask] = useUpdateSubtaskMutation();
  const [deleteSubtask] = useDeleteSubtaskMutation();
  const [title, setTitle] = useState('');

  const subtasks = task.subtasks || [];
  const done = subtasks.filter((s) => s.done).length;
  const pct = subtasks.length ? Math.round((done / subtasks.length) * 100) : 0;

  const onAdd = async (e) => {
    e.preventDefault();
    const t = title.trim();
    if (!t) return;
    setTitle('');
    await runner((b) => addSubtask(b))({ id: task.id, title: t });
  };
  const toggle = runner((b) => updateSubtask(b));
  const remove = runner((b) => deleteSubtask(b));

  return (
    <Section
      title="Checklist"
      icon={ListChecks}
      action={subtasks.length > 0 && <span className="text-xs font-medium text-gray-400">{done}/{subtasks.length}</span>}
    >
      {subtasks.length > 0 && (
        <div className="mb-3 h-1.5 w-full overflow-hidden rounded-full bg-gray-100 dark:bg-gray-800">
          <div className="h-full rounded-full bg-brand-500 transition-all duration-300" style={{ width: `${pct}%` }} />
        </div>
      )}
      <ul className="space-y-1">
        {subtasks.map((s) => (
          <li key={s.id} className="group flex items-center gap-2.5 rounded-lg px-1.5 py-1 hover:bg-gray-50 dark:hover:bg-gray-800/60">
            <input
              type="checkbox"
              checked={s.done}
              onChange={() => toggle({ id: task.id, subId: s.id, done: !s.done })}
              className="h-4 w-4 shrink-0 cursor-pointer rounded border-gray-300 text-brand-600 accent-brand-600 focus:ring-brand-500/40 dark:border-gray-600"
            />
            <span className={cn('flex-1 break-words text-sm', s.done ? 'text-gray-400 line-through' : 'text-gray-700 dark:text-gray-300')}>
              {s.title}
            </span>
            <button
              onClick={() => remove({ id: task.id, subId: s.id })}
              className="shrink-0 rounded p-1 text-gray-300 opacity-0 transition hover:text-danger-500 group-hover:opacity-100"
              aria-label="Remove item"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </li>
        ))}
      </ul>
      <form onSubmit={onAdd} className="mt-1.5 flex items-center gap-2 px-1.5">
        <Plus className="h-4 w-4 shrink-0 text-gray-400" />
        <input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Add an item…"
          className="flex-1 bg-transparent py-1 text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none dark:text-gray-100 dark:placeholder:text-gray-500"
        />
      </form>
    </Section>
  );
}

export function AttachmentsSection({ task }) {
  const [addAttachment, { isLoading: uploading }] = useAddAttachmentMutation();
  const [deleteAttachment] = useDeleteAttachmentMutation();
  const fileRef = useRef(null);
  const attachments = task.attachments || [];

  const onPick = async (e) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    await runner((b) => addAttachment(b))({ id: task.id, file });
  };
  const onDelete = runner((b) => deleteAttachment(b));

  return (
    <Section
      title="Attachments"
      icon={Paperclip}
      action={
        <button
          onClick={() => fileRef.current?.click()}
          disabled={uploading}
          className="flex items-center gap-1 text-xs font-medium text-brand-600 hover:text-brand-700 disabled:opacity-50 dark:text-brand-400"
        >
          {uploading ? <Spinner size="sm" className="h-3.5 w-3.5 border-2" /> : <Plus className="h-3.5 w-3.5" />} Add
        </button>
      }
    >
      <input ref={fileRef} type="file" onChange={onPick} className="hidden" />
      {attachments.length === 0 ? (
        <p className="text-sm text-gray-400">No files attached.</p>
      ) : (
        <ul className="space-y-1.5">
          {attachments.map((a) => (
            <li key={a.id} className="group flex items-center gap-2.5 rounded-lg border border-gray-200 bg-white px-3 py-2 dark:border-white/10 dark:bg-gray-800/60">
              <Paperclip className="h-4 w-4 shrink-0 text-gray-400" />
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium text-gray-700 dark:text-gray-200">{a.name}</p>
                {a.size > 0 && <p className="text-xs text-gray-400">{formatBytes(a.size)}</p>}
              </div>
              <a href={a.url} target="_blank" rel="noreferrer" className="shrink-0 rounded p-1 text-gray-400 transition hover:text-brand-600" aria-label="Download">
                <Download className="h-4 w-4" />
              </a>
              <button onClick={() => onDelete({ id: task.id, attId: a.id })} className="shrink-0 rounded p-1 text-gray-300 opacity-0 transition hover:text-danger-500 group-hover:opacity-100" aria-label="Remove attachment">
                <Trash2 className="h-3.5 w-3.5" />
              </button>
            </li>
          ))}
        </ul>
      )}
    </Section>
  );
}

/** Comments only — rendered as chat bubbles. */
export function CommentsList({ task }) {
  const { memberById } = useDirectory();
  const comments = (task.activity || []).filter((a) => a.type === 'commented');
  if (comments.length === 0) {
    return (
      <div className="flex flex-col items-center gap-1.5 py-6 text-center text-sm text-gray-400">
        <MessageSquare className="h-5 w-5" />
        No comments yet — start the conversation.
      </div>
    );
  }
  return (
    <ul className="space-y-3.5">
      {[...comments].reverse().map((a, i) => {
        const actor = memberById[String(a.actorId)];
        return (
          <li key={i} className="flex gap-2.5 text-sm">
            <Avatar name={actor?.name || '?'} size="xs" className="mt-0.5 shrink-0" />
            <div className="min-w-0 flex-1">
              <div className="rounded-xl rounded-tl-sm bg-gray-50 px-3 py-2 dark:bg-gray-800/70">
                <p className="mb-0.5 text-xs font-medium text-gray-700 dark:text-gray-300">{actor?.name || 'Someone'}</p>
                <p className="whitespace-pre-wrap break-words text-gray-700 dark:text-gray-300">{a.message}</p>
              </div>
              <span className="ml-0.5 mt-1 block text-xs text-gray-400">
                {a.createdAt ? formatDistanceToNow(new Date(a.createdAt), { addSuffix: true }) : ''}
              </span>
            </div>
          </li>
        );
      })}
    </ul>
  );
}

/** System activity (everything except comments) as a timeline. */
export function ActivityFeed({ task }) {
  const { memberById } = useDirectory();
  const events = (task.activity || []).filter((a) => a.type !== 'commented');
  if (events.length === 0) return <p className="text-sm text-gray-400">No activity yet.</p>;
  return (
    <ul className="space-y-3">
      {[...events].reverse().map((a, i) => {
        const actor = memberById[String(a.actorId)];
        return (
          <li key={i} className="flex gap-2.5 text-sm">
            <Avatar name={actor?.name || '?'} size="xs" className="mt-0.5 shrink-0" />
            <div className="min-w-0 flex-1">
              <p className="pt-0.5 text-gray-600 dark:text-gray-400">
                <span className="font-medium text-gray-700 dark:text-gray-300">{actor?.name || 'Someone'}</span> {a.message}
              </p>
              <span className="ml-0.5 block text-xs text-gray-400">
                {a.createdAt ? formatDistanceToNow(new Date(a.createdAt), { addSuffix: true }) : ''}
              </span>
            </div>
          </li>
        );
      })}
    </ul>
  );
}

/** Comment box with lightweight @mention autocomplete. */
export function CommentComposer({ task, className }) {
  const { members } = useDirectory();
  const [comment, { isLoading: commenting }] = useCommentTaskMutation();
  const [message, setMessage] = useState('');
  const inputRef = useRef(null);

  const at = message.lastIndexOf('@');
  const token = at >= 0 ? message.slice(at + 1) : '';
  const active = at >= 0 && /^[\w .'-]*$/.test(token);
  const suggestions = useMemo(() => {
    if (!active) return [];
    const q = token.toLowerCase();
    return members.filter((m) => m.name.toLowerCase().includes(q)).slice(0, 6);
  }, [active, token, members]);

  const pick = (m) => {
    setMessage(`${message.slice(0, at)}@${m.name} `);
    inputRef.current?.focus();
  };

  const onSubmit = async (e) => {
    e.preventDefault();
    const text = message.trim();
    if (!text) return;
    const mentions = members.filter((m) => text.includes(`@${m.name}`)).map((m) => m.id);
    try {
      await comment({ id: task.id, message: text, mentions }).unwrap();
      setMessage('');
    } catch (err) {
      toast.error(getApiErrorMessage(err));
    }
  };

  return (
    <form onSubmit={onSubmit} className={cn('relative flex items-center gap-2', className)}>
      {suggestions.length > 0 && (
        <ul className="absolute bottom-full left-0 mb-2 w-60 overflow-hidden rounded-xl border border-gray-200 bg-white py-1 shadow-pop dark:border-white/10 dark:bg-gray-800">
          {suggestions.map((m) => (
            <li key={m.id}>
              <button
                type="button"
                onClick={() => pick(m)}
                className="flex w-full items-center gap-2 px-3 py-1.5 text-left text-sm text-gray-700 transition hover:bg-brand-50 dark:text-gray-200 dark:hover:bg-brand-500/15"
              >
                <Avatar name={m.name} src={m.avatar} size="xs" />
                <span className="truncate">{m.name}</span>
              </button>
            </li>
          ))}
        </ul>
      )}
      <input
        ref={inputRef}
        value={message}
        onChange={(e) => setMessage(e.target.value)}
        placeholder="Write a comment…  (@ to mention)"
        className="w-full rounded-xl border border-gray-200 bg-white py-2 pl-3.5 pr-3 text-sm text-gray-900 shadow-xs transition placeholder:text-gray-400 focus:border-brand-500 focus:outline-none focus:ring-4 focus:ring-brand-500/12 dark:border-white/10 dark:bg-gray-800/80 dark:text-gray-100 dark:placeholder:text-gray-500"
      />
      <button
        type="submit"
        disabled={commenting || !message.trim()}
        className="rounded-xl bg-brand-600 p-2.5 text-white transition hover:bg-brand-700 disabled:cursor-not-allowed disabled:opacity-40"
        aria-label="Send comment"
      >
        <Send className="h-4 w-4" />
      </button>
    </form>
  );
}
