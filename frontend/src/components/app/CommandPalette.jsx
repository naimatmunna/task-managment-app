import { useState, useEffect, useMemo, useRef } from 'react';
import { createPortal } from 'react-dom';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Search,
  LayoutGrid,
  List,
  Users2,
  BarChart3,
  UserCog,
  Settings,
  User,
  Plus,
} from 'lucide-react';
import { ROUTES } from '@/constants';
import { cn } from '@/lib/classNames.js';

/**
 * Cmd/Ctrl+K command palette for quick navigation and creating a task.
 * `onNewTask` is invoked to open the task modal on the current page.
 */
export default function CommandPalette({ onNewTask }) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [active, setActive] = useState(0);
  const inputRef = useRef(null);
  const navigate = useNavigate();

  const commands = useMemo(
    () => [
      { id: 'new-task', label: 'New task', icon: Plus, run: () => onNewTask?.() },
      { id: 'board', label: 'Go to Board', icon: LayoutGrid, run: () => navigate(ROUTES.BOARD) },
      { id: 'list', label: 'Go to List', icon: List, run: () => navigate(ROUTES.LIST) },
      { id: 'teams', label: 'Go to Teams', icon: Users2, run: () => navigate(ROUTES.TEAMS) },
      { id: 'reports', label: 'Go to Reports', icon: BarChart3, run: () => navigate(ROUTES.REPORTS) },
      { id: 'members', label: 'Go to Members', icon: UserCog, run: () => navigate(ROUTES.MEMBERS) },
      { id: 'settings', label: 'Go to Settings', icon: Settings, run: () => navigate(ROUTES.SETTINGS) },
      { id: 'profile', label: 'Go to Profile', icon: User, run: () => navigate(ROUTES.PROFILE) },
    ],
    [navigate, onNewTask],
  );

  const results = useMemo(() => {
    const q = query.trim().toLowerCase();
    return q ? commands.filter((c) => c.label.toLowerCase().includes(q)) : commands;
  }, [query, commands]);

  useEffect(() => {
    const onKey = (e) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setOpen((v) => !v);
      }
      if (e.key === 'Escape') setOpen(false);
    };
    const openEvt = () => setOpen(true);
    document.addEventListener('keydown', onKey);
    window.addEventListener('propvia:command', openEvt);
    return () => {
      document.removeEventListener('keydown', onKey);
      window.removeEventListener('propvia:command', openEvt);
    };
  }, []);

  useEffect(() => {
    if (open) {
      setQuery('');
      setActive(0);
      setTimeout(() => inputRef.current?.focus(), 30);
    }
  }, [open]);

  const choose = (cmd) => {
    setOpen(false);
    cmd.run();
  };

  const onInputKey = (e) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setActive((a) => Math.min(a + 1, results.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setActive((a) => Math.max(a - 1, 0));
    } else if (e.key === 'Enter' && results[active]) {
      choose(results[active]);
    }
  };

  return createPortal(
    <AnimatePresence>
      {open && (
        <motion.div
          className="fixed inset-0 z-[60] flex items-start justify-center bg-black/40 p-4 pt-[15vh]"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={() => setOpen(false)}
        >
          <motion.div
            className="w-full max-w-lg overflow-hidden rounded-2xl border border-black/5 bg-white shadow-pop dark:border-white/10 dark:bg-gray-900"
            initial={{ scale: 0.97, y: -8 }}
            animate={{ scale: 1, y: 0 }}
            exit={{ scale: 0.97, y: -8 }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center gap-3 border-b border-black/5 px-4 dark:border-white/10">
              <Search className="h-4 w-4 text-gray-400" />
              <input
                ref={inputRef}
                value={query}
                onChange={(e) => {
                  setQuery(e.target.value);
                  setActive(0);
                }}
                onKeyDown={onInputKey}
                placeholder="Search commands…"
                className="w-full bg-transparent py-3.5 text-sm focus:outline-none"
              />
            </div>
            <ul className="max-h-80 overflow-y-auto p-2">
              {results.length === 0 && <li className="px-3 py-6 text-center text-sm text-gray-400">No commands</li>}
              {results.map((cmd, i) => {
                const Icon = cmd.icon;
                return (
                  <li key={cmd.id}>
                    <button
                      onMouseEnter={() => setActive(i)}
                      onClick={() => choose(cmd)}
                      className={cn(
                        'flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left text-sm',
                        i === active ? 'bg-brand-50 text-brand-700 dark:bg-brand-900/30 dark:text-brand-200' : 'text-gray-700 dark:text-gray-200',
                      )}
                    >
                      <Icon className="h-4 w-4" />
                      {cmd.label}
                    </button>
                  </li>
                );
              })}
            </ul>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>,
    document.body,
  );
}
