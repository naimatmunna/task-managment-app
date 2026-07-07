import { useMemo } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { format } from 'date-fns';
import toast from 'react-hot-toast';
import { X, FileText, FileType2, Calendar, Tag } from 'lucide-react';
import { useReleaseNoteQuery } from '@/features/releases/releaseApi.js';
import { downloadReleaseExport } from '@/features/releases/releaseExport.js';
import { STATUS_META } from '@/constants';
import PriorityBadge from '@/components/tasks/PriorityBadge.jsx';
import Avatar from '@/components/ui/Avatar.jsx';
import Spinner from '@/components/ui/Spinner.jsx';

const STATUS_ORDER = ['done', 'in_review', 'in_progress', 'todo', 'backlog'];
const fmt = (d) => (d ? format(new Date(d), 'MMM d, yyyy') : '—');

export default function ReleaseViewPanel({ noteId, onClose }) {
  const open = Boolean(noteId);
  const { data: note, isLoading } = useReleaseNoteQuery(noteId, { skip: !noteId });

  const groups = useMemo(() => {
    const g = {};
    (note?.tasks || []).forEach((t) => {
      (g[t.status] ||= []).push(t);
    });
    return g;
  }, [note]);

  const onDownload = async (fmtKind) => {
    try {
      const base = `${note.title}${note.version ? ` ${note.version}` : ''}`;
      await downloadReleaseExport(note.id, fmtKind, base);
    } catch {
      toast.error('Export failed');
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
            className="flex h-full w-full max-w-lg flex-col bg-white shadow-pop dark:bg-gray-900"
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'tween', duration: 0.22 }}
            onClick={(e) => e.stopPropagation()}
          >
            <header className="flex items-center justify-between border-b border-black/5 px-5 py-3 dark:border-white/10">
              <span className="text-sm font-medium text-gray-400">Release note</span>
              <button onClick={onClose} className="rounded-md p-1.5 text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800" aria-label="Close">
                <X className="h-5 w-5" />
              </button>
            </header>

            {isLoading || !note ? (
              <div className="flex flex-1 items-center justify-center">
                <Spinner />
              </div>
            ) : (
              <div className="flex-1 overflow-y-auto px-5 py-4">
                <h1 className="text-xl font-bold tracking-tight text-gray-900 dark:text-gray-50">{note.title}</h1>
                <div className="mt-2 flex flex-wrap items-center gap-3 text-sm text-gray-500">
                  {note.version && (
                    <span className="inline-flex items-center gap-1 rounded-full bg-brand-500/15 px-2.5 py-0.5 text-xs font-semibold text-brand-700 ring-1 ring-inset ring-brand-500/25 dark:text-brand-300">
                      <Tag className="h-3 w-3" /> {note.version}
                    </span>
                  )}
                  <span className="inline-flex items-center gap-1.5">
                    <Calendar className="h-4 w-4" /> {fmt(note.dateFrom)} – {fmt(note.dateTo)}
                  </span>
                  <span className="tabular-nums">{note.tasks.length} tasks</span>
                </div>

                <div className="mt-4 flex gap-2">
                  <button onClick={() => onDownload('pdf')} className="inline-flex items-center gap-1.5 rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-sm font-medium text-gray-700 shadow-xs transition hover:bg-gray-50 dark:border-white/10 dark:bg-gray-800 dark:text-gray-200">
                    <FileText className="h-4 w-4 text-red-500" /> PDF
                  </button>
                  <button onClick={() => onDownload('docx')} className="inline-flex items-center gap-1.5 rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-sm font-medium text-gray-700 shadow-xs transition hover:bg-gray-50 dark:border-white/10 dark:bg-gray-800 dark:text-gray-200">
                    <FileType2 className="h-4 w-4 text-info-600" /> Word
                  </button>
                </div>

                {note.details?.trim() && (
                  <div className="mt-5 rounded-xl border border-gray-200/70 bg-gray-50/60 p-4 dark:border-white/10 dark:bg-gray-800/40">
                    <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-gray-400">Overview</p>
                    <p className="whitespace-pre-wrap text-sm leading-relaxed text-gray-700 dark:text-gray-300">{note.details}</p>
                  </div>
                )}

                <div className="mt-6 space-y-5">
                  {STATUS_ORDER.filter((s) => groups[s]?.length).map((status) => {
                    const meta = STATUS_META[status];
                    return (
                      <div key={status}>
                        <div className="mb-2 flex items-center gap-2 text-sm font-semibold text-gray-700 dark:text-gray-200">
                          <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: meta.color }} />
                          {meta.label}
                          <span className="text-xs font-medium text-gray-400">({groups[status].length})</span>
                        </div>
                        <ul className="space-y-2">
                          {groups[status].map((t) => (
                            <li key={t.taskId || t.title} className="rounded-lg border border-gray-200/70 bg-white p-3 shadow-xs dark:border-white/10 dark:bg-gray-800/50">
                              <p className="text-sm font-medium text-gray-900 dark:text-gray-100">{t.title}</p>
                              <div className="mt-1.5 flex flex-wrap items-center gap-2 text-xs text-gray-500">
                                <PriorityBadge priority={t.priority} />
                                {t.assignee && t.assignee !== 'Unassigned' && (
                                  <span className="inline-flex items-center gap-1">
                                    <Avatar name={t.assignee} size="xs" /> {t.assignee}
                                  </span>
                                )}
                                {t.team && <span>· {t.team}</span>}
                                {t.completedAt && <span>· shipped {fmt(t.completedAt)}</span>}
                              </div>
                            </li>
                          ))}
                        </ul>
                      </div>
                    );
                  })}
                  {note.tasks.length === 0 && (
                    <p className="py-8 text-center text-sm text-gray-400">No tasks were completed in this range.</p>
                  )}
                </div>
              </div>
            )}
          </motion.aside>
        </motion.div>
      )}
    </AnimatePresence>,
    document.body,
  );
}
