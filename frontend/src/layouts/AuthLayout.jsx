import { Outlet, Link } from 'react-router-dom';
import { Sparkles, LayoutGrid, Users, BarChart3, Star } from 'lucide-react';
import { config } from '@/config/env.js';
import ThemeToggle from '@/components/common/ThemeToggle.jsx';
import { ROUTES } from '@/constants';
import authHero from '@/assets/auth-hero.svg';

const FEATURES = [
  { icon: LayoutGrid, label: 'Kanban boards & task lists' },
  { icon: Users, label: 'Team invites & roles' },
  { icon: BarChart3, label: 'Reports & activity' },
];

const STATS = [
  { value: '12k+', label: 'Teams' },
  { value: '1.2M', label: 'Tasks shipped' },
  { value: '99.9%', label: 'Uptime' },
];

/** Split auth layout — brand image hero on the left, form column on the right. */
export default function AuthLayout() {
  return (
    <div className="flex min-h-screen bg-white dark:bg-gray-950">
      {/* LEFT — AI-generated brand hero (desktop only). Permanently dark panel. */}
      <aside className="relative hidden w-[45%] overflow-hidden lg:flex xl:w-1/2">
        <img
          src={authHero}
          alt=""
          aria-hidden="true"
          className="absolute inset-0 h-full w-full object-cover"
        />
        {/* Legibility scrim */}
        <div
          aria-hidden="true"
          className="absolute inset-0 bg-gradient-to-t from-[#1b1147]/95 via-[#2a1e63]/40 to-[#2a1e63]/20"
        />

        <div className="relative z-10 flex w-full flex-col justify-between p-12 xl:p-16">
          {/* Brand mark */}
          <Link to={ROUTES.HOME} className="flex w-fit items-center gap-2.5">
            <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-white/10 text-white ring-1 ring-white/20 backdrop-blur-sm">
              <Sparkles className="h-4 w-4" strokeWidth={2.25} />
            </span>
            <span className="text-base font-semibold tracking-tight text-white">
              {config.appName}
            </span>
          </Link>

          {/* Bottom content */}
          <div className="max-w-md">
            <p className="text-sm font-medium uppercase tracking-wider text-brand-200">
              Team task management
            </p>
            <h2 className="mt-3 text-3xl font-semibold tracking-tight text-white xl:text-4xl">
              Team work, organized.
            </h2>
            <p className="mt-4 text-base leading-relaxed text-brand-100/80">
              Boards, tasks, and reports — everything your team needs to plan, assign, and ship on
              time.
            </p>

            <ul className="mt-8 space-y-3">
              {FEATURES.map(({ icon: Icon, label }) => (
                <li key={label} className="flex items-center gap-3 text-sm text-white/90">
                  <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-white/10 text-white ring-1 ring-white/20 backdrop-blur-sm">
                    <Icon className="h-4 w-4" strokeWidth={2} />
                  </span>
                  {label}
                </li>
              ))}
            </ul>

            {/* Testimonial */}
            <figure className="mt-10 rounded-2xl border border-white/20 bg-white/10 p-5 backdrop-blur-md">
              <div className="flex gap-0.5 text-brand-200">
                {Array.from({ length: 5 }).map((_, i) => (
                  <Star key={i} className="h-4 w-4 fill-current" strokeWidth={0} />
                ))}
              </div>
              <blockquote className="mt-3 text-[0.95rem] leading-relaxed text-white/90">
                “We replaced three tools with {config.appName}. Our team ships faster and nothing
                slips through the cracks.”
              </blockquote>
              <figcaption className="mt-4 flex items-center gap-3">
                <span className="flex h-9 w-9 items-center justify-center rounded-full bg-white/20 text-sm font-semibold text-white ring-1 ring-white/20">
                  SR
                </span>
                <span className="text-sm">
                  <span className="block font-medium text-white">Sara Reyes</span>
                  <span className="block text-white/60">Head of Product, Northwind</span>
                </span>
              </figcaption>
            </figure>

            {/* Stats */}
            <dl className="mt-8 grid grid-cols-3 gap-4 border-t border-white/20 pt-6">
              {STATS.map(({ value, label }) => (
                <div key={label}>
                  <dt className="sr-only">{label}</dt>
                  <dd className="text-2xl font-semibold tracking-tight text-white">{value}</dd>
                  <p className="mt-0.5 text-xs text-white/60">{label}</p>
                </div>
              ))}
            </dl>
          </div>
        </div>
      </aside>

      {/* RIGHT — form column. Solid surface so light/dark always matches. */}
      <div className="flex w-full flex-col lg:w-[55%] xl:w-1/2">
        <header className="flex items-center justify-between px-5 py-4 sm:px-8 lg:px-10">
          {/* Logo — visible on mobile where the hero is hidden */}
          <Link to={ROUTES.HOME} className="flex items-center gap-2.5 lg:invisible">
            <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-brand-500 to-brand-700 text-white shadow-glow">
              <Sparkles className="h-4 w-4" strokeWidth={2.25} />
            </span>
            <span className="text-base font-semibold tracking-tight text-gray-900 dark:text-gray-50">
              {config.appName}
            </span>
          </Link>
          <ThemeToggle />
        </header>

        <main className="flex flex-1 items-center justify-center px-5 py-8 sm:px-8 lg:px-10">
          <div className="w-full max-w-md animate-slide-up">
            <Outlet />
          </div>
        </main>

        <footer className="px-5 py-4 text-center text-xs text-gray-400 sm:px-8 lg:px-10 dark:text-gray-500">
          © {new Date().getFullYear()} {config.appName}
        </footer>
      </div>
    </div>
  );
}
