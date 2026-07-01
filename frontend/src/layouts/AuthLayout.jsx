import { Outlet, Link } from 'react-router-dom';
import { config } from '@/config/env.js';
import ThemeToggle from '@/components/common/ThemeToggle.jsx';
import { ROUTES } from '@/constants';

/** Centered card layout for auth pages. */
export default function AuthLayout() {
  return (
    <div className="flex min-h-screen flex-col bg-gray-50 dark:bg-gray-950">
      <header className="flex items-center justify-between p-4">
        <Link to={ROUTES.HOME} className="text-lg font-bold text-brand-600">
          {config.appName}
        </Link>
        <ThemeToggle />
      </header>
      <main className="flex flex-1 items-center justify-center p-4">
        <div className="w-full max-w-md rounded-2xl bg-white p-8 shadow-lg dark:bg-gray-900">
          <Outlet />
        </div>
      </main>
    </div>
  );
}
