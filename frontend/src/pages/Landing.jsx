import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { config } from '@/config/env.js';
import { ROUTES } from '@/constants';
import ThemeToggle from '@/components/common/ThemeToggle.jsx';
import PageMeta from '@/components/common/PageMeta.jsx';

export default function Landing() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-white to-gray-50 dark:from-gray-950 dark:to-gray-900">
      <PageMeta title="Home" />
      <header className="mx-auto flex max-w-6xl items-center justify-between p-6">
        <span className="text-xl font-bold text-brand-600">{config.appName}</span>
        <div className="flex items-center gap-3">
          <ThemeToggle />
          <Link to={ROUTES.LOGIN} className="rounded-lg px-4 py-2 text-sm font-medium hover:bg-gray-100 dark:hover:bg-gray-800">
            Sign in
          </Link>
          <Link to={ROUTES.REGISTER} className="rounded-lg bg-brand-600 px-4 py-2 text-sm font-medium text-white hover:bg-brand-700">
            Get started
          </Link>
        </div>
      </header>
      <main className="mx-auto max-w-3xl px-6 py-24 text-center">
        <motion.h1
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-5xl font-extrabold tracking-tight sm:text-6xl"
        >
          The production-ready <span className="text-brand-600">MERN</span> starter
        </motion.h1>
        <motion.p
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="mx-auto mt-6 max-w-xl text-lg text-gray-600 dark:text-gray-400"
        >
          Auth with refresh-token rotation, RBAC, clean architecture, and a modern React stack —
          wired, tested, and ready to build on.
        </motion.p>
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="mt-10"
        >
          <Link to={ROUTES.REGISTER} className="rounded-lg bg-brand-600 px-8 py-3 text-lg font-medium text-white hover:bg-brand-700">
            Start building
          </Link>
        </motion.div>
      </main>
    </div>
  );
}
