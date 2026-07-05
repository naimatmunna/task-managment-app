import { Outlet, Link } from 'react-router-dom';
import { Sparkles } from 'lucide-react';
import { config } from '@/config/env.js';
import ThemeToggle from '@/components/common/ThemeToggle.jsx';
import { ROUTES } from '@/constants';

/** Centered card layout for auth pages, over a signature iris mesh background. */
export default function AuthLayout() {
  return (
    <div className="bg-auth flex min-h-screen flex-col">
      <header className="flex items-center justify-between px-5 py-4">
        <Link to={ROUTES.HOME} className="flex items-center gap-2">
          <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-gradient-to-br from-brand-500 to-brand-700 text-white shadow-glow">
            <Sparkles className="h-4 w-4" strokeWidth={2.25} />
          </span>
          <span className="text-[15px] font-semibold tracking-tight text-gray-900 dark:text-gray-50">
            {config.appName}
          </span>
        </Link>
        <ThemeToggle />
      </header>

      <main className="flex flex-1 items-center justify-center p-4">
        <div className="w-full max-w-md animate-scale-in rounded-3xl border border-gray-200/60 bg-white/90 p-8 shadow-pop backdrop-blur-xl dark:border-white/10 dark:bg-gray-900/80 sm:p-9">
          <Outlet />
        </div>
      </main>

      <footer className="px-5 py-4 text-center text-xs text-gray-400">
        © {config.appName} — team task management, done right.
      </footer>
    </div>
  );
}
