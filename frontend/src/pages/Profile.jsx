import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import toast from 'react-hot-toast';
import { useAuth } from '@/hooks/useAuth.js';
import { useOrg } from '@/hooks/useOrg.js';
import { useChangePasswordMutation } from '@/features/auth/authApi.js';
import { getApiErrorMessage } from '@/helpers/apiError.js';
import { formatDateTime } from '@/helpers/format.js';
import { ROLE_META } from '@/constants';
import PageHeader from '@/components/app/PageHeader.jsx';
import PageMeta from '@/components/common/PageMeta.jsx';
import Card from '@/components/ui/Card.jsx';
import Input from '@/components/ui/Input.jsx';
import Button from '@/components/ui/Button.jsx';
import Badge from '@/components/ui/Badge.jsx';

const schema = z.object({
  currentPassword: z.string().min(1, 'Required'),
  newPassword: z.string().min(8, 'At least 8 characters'),
});

export default function Profile() {
  const { user } = useAuth();
  const { memberships } = useOrg();
  const [changePassword, { isLoading }] = useChangePasswordMutation();
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm({ resolver: zodResolver(schema) });

  const onSubmit = async (values) => {
    try {
      await changePassword(values).unwrap();
      toast.success('Password changed.');
      reset();
    } catch (err) {
      toast.error(getApiErrorMessage(err));
    }
  };

  const rows = [
    ['Name', user?.name],
    ['Email', user?.email],
    ['Email verified', user?.isEmailVerified ? 'Yes' : 'No'],
    ['Last login', formatDateTime(user?.lastLoginAt)],
  ];

  return (
    <>
      <PageMeta title="Profile" />
      <PageHeader title="Your profile" description="Account details and security." />

      <div className="grid gap-6 lg:grid-cols-2">
        <Card className="divide-y divide-black/5 dark:divide-white/10">
          {rows.map(([label, value]) => (
            <div key={label} className="flex justify-between px-5 py-3">
              <span className="text-sm text-gray-500">{label}</span>
              <span className="text-sm font-medium">{value || '—'}</span>
            </div>
          ))}
          <div className="px-5 py-3">
            <span className="text-sm text-gray-500">Organizations</span>
            <div className="mt-2 flex flex-wrap gap-2">
              {memberships.map((m) => (
                <Badge key={m.organization.id} className={ROLE_META[m.role] || ROLE_META.member}>
                  {m.organization.name} · <span className="capitalize">{m.role}</span>
                </Badge>
              ))}
            </div>
          </div>
        </Card>

        <Card className="p-5">
          <h2 className="mb-4 text-sm font-semibold text-gray-900 dark:text-gray-100">Change password</h2>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <Input
              label="Current password"
              type="password"
              id="currentPassword"
              autoComplete="current-password"
              error={errors.currentPassword?.message}
              {...register('currentPassword')}
            />
            <Input
              label="New password"
              type="password"
              id="newPassword"
              autoComplete="new-password"
              error={errors.newPassword?.message}
              {...register('newPassword')}
            />
            <Button type="submit" isLoading={isLoading}>
              Update password
            </Button>
          </form>
        </Card>
      </div>
    </>
  );
}
