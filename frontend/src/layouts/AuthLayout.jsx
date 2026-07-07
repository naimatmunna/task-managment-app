import { Outlet, Link } from 'react-router-dom';
import { Sparkles, LayoutGrid, Users, BarChart3 } from 'lucide-react';
import { config } from '@/config/env.js';
import ThemeToggle from '@/components/common/ThemeToggle.jsx';
import { ROUTES } from '@/constants';

const FEATURES = [
  { icon: LayoutGrid, label: 'Kanban boards & task lists' },
  { icon: Users, label: 'Team invites & roles' },
  { icon: BarChart3, label: 'Reports & activity' },
];

/** Split auth layout — form column + brand hero on desktop. */
export default function AuthLayout() {
  return (
    <div className="bg-auth flex min-h-screen">
      <div className="flex w-full flex-col lg:w-[min(100%,36rem)] xl:w-[min(100%,40rem)]">
        <header className="flex items-center justify-between px-5 py-4 lg:px-10">
          <Link to={ROUTES.HOME} className="flex items-center gap-2.5">
            <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-brand-500 to-brand-700 text-white shadow-glow">
              <Sparkles className="h-4 w-4" strokeWidth={2.25} />
            </span>
            <span className="text-base font-semibold tracking-tight text-gray-900 dark:text-gray-50">
              {config.appName}
            </span>
          </Link>
          <ThemeToggle />
        </header>

        <main className="flex flex-1 items-center justify-center px-5 pb-6 lg:px-10 lg:pb-10">
          <div className="w-full max-w-md animate-slide-up rounded-3xl border border-gray-200/60 bg-white/90 p-8 shadow-pop backdrop-blur-xl dark:border-white/10 dark:bg-gray-900/80 sm:p-9 lg:rounded-none lg:border-0 lg:bg-transparent lg:p-0 lg:shadow-none lg:backdrop-blur-none">
            <Outlet />
          </div>
        </main>

        <footer className="px-5 py-4 text-center text-xs text-gray-400 lg:px-10">
          © {new Date().getFullYear()} {config.appName}
        </footer>
      </div>

      <aside className="relative hidden flex-1 flex-col justify-center border-l border-gray-200/50 p-12 xl:p-16 dark:border-white/10 lg:flex">
        <div className="max-w-lg">
          <p className="text-sm font-medium uppercase tracking-wider text-brand-600 dark:text-brand-400">
            Team task management
          </p>
          <h2 className="mt-3 text-3xl font-semibold tracking-tight text-gray-900 dark:text-white xl:text-4xl">
            Team work, organized.
          </h2>
          <p className="mt-4 text-lg leading-relaxed text-gray-600 dark:text-gray-300">
            Boards, tasks, and reports — everything your team needs to plan, assign, and ship on time.
          </p>
          <ul className="mt-10 space-y-4">
            {FEATURES.map(({ icon: Icon, label }) => (
              <li key={label} className="flex items-center gap-3 text-sm text-gray-600 dark:text-gray-300">
                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-brand-100 text-brand-600 dark:bg-brand-500/15 dark:text-brand-300">
                  <Icon className="h-4 w-4" strokeWidth={2} />
                </span>
                {label}
              </li>
            ))}
          </ul>
        </div>
      </aside>
    </div>
  );
}
