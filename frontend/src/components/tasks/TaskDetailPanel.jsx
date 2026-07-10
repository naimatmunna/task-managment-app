import { createPortal } from 'react-dom';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import toast from 'react-hot-toast';
import { X, Trash2, Maximize2, MessageSquare, Activity as ActivityIcon } from 'lucide-react';
import { useTaskQuery, useDeleteTaskMutation } from '@/features/tasks/taskApi.js';
import { getApiErrorMessage } from '@/helpers/apiError.js';
import { taskPath } from '@/constants';
import Spinner from '@/components/ui/Spinner.jsx';
import {
  PRIORITY_DOT,
  Section,
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

/** Quick-view drawer. Mirrors the full detail page; "Full details" opens the page. */
export default function TaskDetailPanel({ taskId, onClose }) {
  const open = Boolean(taskId);
  const navigate = useNavigate();
  const { data: task, isLoading } = useTaskQuery(taskId, { skip: !taskId });
  const [deleteTask] = useDeleteTaskMutation();

  const openFull = () => {
    onClose();
    navigate(taskPath(taskId));
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
                <span className="text-sm font-medium text-gray-500 dark:text-gray-400">Quick view</span>
              </div>
              <div className="flex items-center gap-1">
                <button
                  onClick={openFull}
                  className="flex items-center gap-1 rounded-lg px-2 py-1.5 text-xs font-medium text-brand-600 transition hover:bg-brand-50 dark:text-brand-400 dark:hover:bg-brand-500/15"
                  aria-label="Open full details"
                >
                  <Maximize2 className="h-3.5 w-3.5" /> Full details
                </button>
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
                <TitleEditor task={task} />

                <Section title="Properties">
                  <PropertiesGrid task={task} />
                </Section>

                <Section title="Description">
                  <DescriptionEditor task={task} />
                </Section>

                <ChecklistSection task={task} />

                <AttachmentsSection task={task} />

                <Section title="Comments" icon={MessageSquare}>
                  <CommentsList task={task} />
                </Section>

                <Section title="Activity" icon={ActivityIcon}>
                  <ActivityFeed task={task} />
                </Section>
              </div>
            )}

            {task && (
              <div className="border-t border-black/5 bg-white/70 p-3 backdrop-blur dark:border-white/10 dark:bg-gray-900/70">
                <CommentComposer task={task} />
              </div>
            )}
          </motion.aside>
        </motion.div>
      )}
    </AnimatePresence>,
    document.body,
  );
}
