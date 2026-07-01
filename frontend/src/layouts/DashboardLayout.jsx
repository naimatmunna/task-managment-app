import { useState } from 'react';
import { Outlet, NavLink, useNavigate } from 'react-router-dom';
import { FiUsers, FiHome, FiUser, FiLogOut, FiMenu } from 'react-icons/fi';
import toast from 'react-hot-toast';
import { config } from '@/config/env.js';
import { ROUTES } from '@/constants';
import { useAuth } from '@/hooks/useAuth.js';
import { usePermissions } from '@/hooks/usePermissions.js';
import { useLogoutMutation } from '@/features/auth/authApi.js';
import ThemeToggle from '@/components/common/ThemeToggle.jsx';
import { cn } from '@/lib/classNames.js';

const nav = [
  { to: ROUTES.DASHBOARD, label: 'Overview', icon: FiHome, end: true },
  { to: ROUTES.USERS, label: 'Users', icon: FiUsers, adminOnly: true },
  { to: ROUTES.PROFILE, label: 'Profile', icon: FiUser },
];

export default function DashboardLayout() {
  const [open, setOpen] = useState(false);
  const { user } = useAuth();
  const { isAdmin } = usePermissions();
  const [logout] = useLogoutMutation();
  const navigate = useNavigate();

  const handleLogout = async () => {
    await logout().unwrap().catch(() => {});
    toast.success('Signed out');
    navigate(ROUTES.LOGIN);
  };

  return (
    <div className="flex min-h-screen bg-gray-50 dark:bg-gray-950">
      <aside
        className={cn(
          'fixed inset-y-0 left-0 z-30 w-64 transform bg-white p-4 shadow-lg transition-transform dark:bg-gray-900 md:static md:translate-x-0',
          open ? 'translate-x-0' : '-translate-x-full',
        )}
      >
        <div className="mb-8 px-2 text-xl font-bold text-brand-600">{config.appName}</div>
        <nav className="space-y-1">
          {nav
            .filter((item) => !item.adminOnly || isAdmin)
            .map(({ to, label, icon: Icon, end }) => (
              <NavLink
                key={to}
                to={to}
                end={end}
                onClick={() => setOpen(false)}
                className={({ isActive }) =>
                  cn(
                    'flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition',
                    isActive
                      ? 'bg-brand-50 text-brand-700 dark:bg-brand-900/40 dark:text-brand-300'
                      : 'text-gray-600 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-800',
                  )
                }
              >
                <Icon /> {label}
              </NavLink>
            ))}
        </nav>
      </aside>

      <div className="flex flex-1 flex-col md:ml-0">
        <header className="flex items-center justify-between border-b border-gray-200 bg-white px-4 py-3 dark:border-gray-800 dark:bg-gray-900">
          <button className="md:hidden" onClick={() => setOpen((v) => !v)} aria-label="Menu">
            <FiMenu />
          </button>
          <div className="ml-auto flex items-center gap-3">
            <ThemeToggle />
            <span className="hidden text-sm text-gray-600 dark:text-gray-300 sm:block">
              {user?.name}
            </span>
            <button
              onClick={handleLogout}
              className="flex items-center gap-1 rounded-lg px-3 py-1.5 text-sm text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20"
            >
              <FiLogOut /> Logout
            </button>
          </div>
        </header>
        <main className="flex-1 p-4 md:p-6">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
