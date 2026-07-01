import { motion } from 'framer-motion';
import { FiUsers, FiActivity, FiCheckCircle } from 'react-icons/fi';
import { useAuth } from '@/hooks/useAuth.js';
import PageMeta from '@/components/common/PageMeta.jsx';

const stats = [
  { label: 'Total Users', value: '—', icon: FiUsers },
  { label: 'Active Sessions', value: '—', icon: FiActivity },
  { label: 'System Status', value: 'Healthy', icon: FiCheckCircle },
];

export default function Dashboard() {
  const { user } = useAuth();
  return (
    <>
      <PageMeta title="Dashboard" />
      <h1 className="mb-2 text-2xl font-bold">Welcome back, {user?.name?.split(' ')[0]} 👋</h1>
      <p className="mb-6 text-gray-600 dark:text-gray-400">Here&rsquo;s an overview of your workspace.</p>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {stats.map((s, i) => (
          <motion.div
            key={s.label}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.08 }}
            className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm dark:border-gray-800 dark:bg-gray-900"
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">{s.label}</p>
                <p className="mt-1 text-2xl font-bold">{s.value}</p>
              </div>
              <s.icon className="text-3xl text-brand-500" />
            </div>
          </motion.div>
        ))}
      </div>
    </>
  );
}
