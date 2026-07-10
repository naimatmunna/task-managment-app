import { useState } from 'react';
import { Outlet, NavLink, useNavigate } from 'react-router-dom';
import {
  LayoutGrid,
  List,
  Users2,
  BarChart3,
  UserCog,
  Settings,
  LogOut,
  Menu,
  X,
  Search,
  Sparkles,
  Rocket,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { config } from '@/config/env.js';
import { ROUTES } from '@/constants';
import { useAuth } from '@/hooks/useAuth.js';
import { useOrg } from '@/hooks/useOrg.js';
import { useRealtime } from '@/hooks/useRealtime.js';
import { useMeQuery, useLogoutMutation } from '@/features/auth/authApi.js';
import ThemeToggle from '@/components/common/ThemeToggle.jsx';
import OrgSwitcher from '@/components/app/OrgSwitcher.jsx';
import NotificationBell from '@/components/app/NotificationBell.jsx';
import CommandPalette from '@/components/app/CommandPalette.jsx';
import TaskFormModal from '@/components/tasks/TaskFormModal.jsx';
import Avatar from '@/components/ui/Avatar.jsx';
import Spinner from '@/components/ui/Spinner.jsx';
import { cn } from '@/lib/classNames.js';

const NAV = [
  { to: ROUTES.BOARD, label: 'Board', icon: LayoutGrid },
  { to: ROUTES.LIST, label: 'List', icon: List },
  { to: ROUTES.TEAMS, label: 'Teams', icon: Users2 },
  { to: ROUTES.REPORTS, label: 'Reports', icon: BarChart3 },
  { to: ROUTES.RELEASES, label: 'Releases', icon: Rocket },
  { to: ROUTES.MEMBERS, label: 'Members', icon: UserCog },
  { to: ROUTES.SETTINGS, label: 'Settings', icon: Settings, manageOnly: true },
];

export default function DashboardLayout() {
  const [open, setOpen] = useState(false);
  const [newTaskOpen, setNewTaskOpen] = useState(false);
  const { user } = useAuth();
  const { canManage } = useOrg();
  const navigate = useNavigate();

  // Hydrate the session (user + memberships + active org) on load / refresh.
  const { isLoading } = useMeQuery();
  const [logout] = useLogoutMutation();

  // Live task updates + member presence for the whole authenticated session.
  useRealtime();

  const handleLogout = async () => {
    await logout().unwrap().catch(() => {});
    toast.success('Signed out');
    navigate(ROUTES.LOGIN, { replace: true });
  };

  if (isLoading && !user) {
    return (
      <div className="bg-app flex min-h-screen items-center justify-center">
        <Spinner />
      </div>
    );
  }

  return (
    <div className="bg-app flex min-h-screen">
      {/* Mobile backdrop */}
      {open && (
        <div
          className="fixed inset-0 z-20 bg-gray-950/40 backdrop-blur-sm md:hidden"
          onClick={() => setOpen(false)}
          aria-hidden
        />
      )}

      <aside
        className={cn(
          'fixed left-0 top-0 z-30 flex h-screen w-64 flex-col border-r border-gray-200/70 bg-white transition-transform duration-300 ease-smooth dark:border-white/10 dark:bg-gray-900',
          // Desktop: stick to the viewport while the page scrolls (X-style),
          // scroll internally only if the nav overflows.
          'md:sticky md:translate-x-0 md:overflow-y-auto md:overscroll-contain',
          open ? 'translate-x-0' : '-translate-x-full',
        )}
      >
        {/* Brand mark */}
        <div className="flex items-center justify-between px-4 pt-4">
          <div className="flex items-center gap-2">
            <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-gradient-to-br from-brand-500 to-brand-700 text-white shadow-glow">
              <Sparkles className="h-4 w-4" strokeWidth={2.25} />
            </span>
            <span className="text-[15px] font-semibold tracking-tight text-gray-900 dark:text-gray-50">
              {config.appName}
            </span>
          </div>
          <button className="p-1 text-gray-400 md:hidden" onClick={() => setOpen(false)} aria-label="Close menu">
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="px-2 pt-3">
          <OrgSwitcher />
        </div>

        <nav className="flex-1 space-y-0.5 px-2 py-2">
          {NAV.filter((i) => !i.manageOnly || canManage).map(({ to, label, icon: Icon }) => (
            <NavLink
              key={to}
              to={to}
              onClick={() => setOpen(false)}
              className={({ isActive }) =>
                cn(
                  'group flex items-center gap-3 rounded-xl px-3 py-2 text-sm font-medium transition-all duration-150 ease-smooth',
                  isActive
                    ? 'bg-brand-50 text-brand-700 shadow-xs ring-1 ring-inset ring-brand-100 dark:bg-brand-500/15 dark:text-brand-200 dark:ring-brand-500/20'
                    : 'text-gray-600 hover:bg-gray-100/80 hover:text-gray-900 dark:text-gray-300 dark:hover:bg-gray-800',
                )
              }
            >
              <Icon className="h-[18px] w-[18px]" strokeWidth={2} />
              {label}
            </NavLink>
          ))}
        </nav>

        <div className="border-t border-gray-200/70 p-2.5 dark:border-white/10">
          <NavLink
            to={ROUTES.PROFILE}
            onClick={() => setOpen(false)}
            className="flex items-center gap-2.5 rounded-xl px-2 py-1.5 transition-colors hover:bg-gray-100/80 dark:hover:bg-gray-800"
          >
            <Avatar name={user?.name} src={user?.avatar?.url} size="sm" />
            <span className="min-w-0 flex-1">
              <span className="block truncate text-sm font-medium text-gray-900 dark:text-gray-100">
                {user?.name}
              </span>
              <span className="block truncate text-xs text-gray-400">{user?.email}</span>
            </span>
          </NavLink>
        </div>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="glass sticky top-0 z-10 flex items-center gap-3 border-b border-gray-200/70 px-4 py-2.5 dark:border-white/10">
          <button
            className="text-gray-500 md:hidden"
            onClick={() => setOpen(true)}
            aria-label="Open menu"
          >
            <Menu className="h-5 w-5" />
          </button>
          <button
            onClick={() => window.dispatchEvent(new Event('propvia:command'))}
            className="hidden items-center gap-2 rounded-xl border border-gray-200 bg-white/60 px-3 py-1.5 text-sm text-gray-400 shadow-xs transition-all duration-150 hover:border-gray-300 hover:text-gray-600 hover:shadow-soft sm:flex dark:border-white/10 dark:bg-gray-800/40 dark:hover:border-white/20"
          >
            <Search className="h-4 w-4" />
            <span>Search or jump to…</span>
            <kbd className="rounded-md border border-gray-200 bg-gray-50 px-1.5 font-sans text-xs text-gray-500 dark:border-white/10 dark:bg-gray-800">
              ⌘K
            </kbd>
          </button>
          <div className="ml-auto flex items-center gap-0.5">
            <NotificationBell />
            <ThemeToggle />
            <button
              onClick={handleLogout}
              className="flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-sm text-gray-500 transition-colors hover:bg-gray-100 hover:text-gray-800 dark:text-gray-300 dark:hover:bg-gray-800"
            >
              <LogOut className="h-4 w-4" /> <span className="hidden sm:inline">Sign out</span>
            </button>
          </div>
        </header>

        <main className="mx-auto w-full max-w-full flex-1 animate-fade-in px-4 py-6 md:px-8 md:py-8">
          <Outlet />
        </main>
      </div>

      <CommandPalette onNewTask={() => setNewTaskOpen(true)} />
      {newTaskOpen && <TaskFormModal open onClose={() => setNewTaskOpen(false)} />}
    </div>
  );
}
