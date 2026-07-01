import { useAuth } from '@/hooks/useAuth.js';
import { formatDateTime } from '@/helpers/format.js';
import PageMeta from '@/components/common/PageMeta.jsx';

export default function Profile() {
  const { user } = useAuth();
  const rows = [
    ['Name', user?.name],
    ['Email', user?.email],
    ['Roles', user?.roles?.join(', ')],
    ['Email verified', user?.isEmailVerified ? 'Yes' : 'No'],
    ['Last login', formatDateTime(user?.lastLoginAt)],
  ];
  return (
    <>
      <PageMeta title="Profile" />
      <h1 className="mb-6 text-2xl font-bold">Your profile</h1>
      <div className="max-w-lg divide-y divide-gray-200 rounded-xl border border-gray-200 bg-white dark:divide-gray-800 dark:border-gray-800 dark:bg-gray-900">
        {rows.map(([label, value]) => (
          <div key={label} className="flex justify-between px-5 py-3">
            <span className="text-sm text-gray-500">{label}</span>
            <span className="text-sm font-medium">{value || '—'}</span>
          </div>
        ))}
      </div>
    </>
  );
}
