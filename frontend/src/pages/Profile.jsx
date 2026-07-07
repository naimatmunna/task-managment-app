import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import toast from 'react-hot-toast';
import { useAuth } from '@/hooks/useAuth.js';
import { useOrg } from '@/hooks/useOrg.js';
import { useChangePasswordMutation, useUpdateProfileMutation } from '@/features/auth/authApi.js';
import { getApiErrorMessage } from '@/helpers/apiError.js';
import { formatDateTime } from '@/helpers/format.js';
import { ROLE_META } from '@/constants';
import PageHeader from '@/components/app/PageHeader.jsx';
import PageMeta from '@/components/common/PageMeta.jsx';
import Card from '@/components/ui/Card.jsx';
import Input from '@/components/ui/Input.jsx';
import Button from '@/components/ui/Button.jsx';
import Badge from '@/components/ui/Badge.jsx';
import Avatar from '@/components/ui/Avatar.jsx';

const profileSchema = z.object({
  name: z.string().min(2, 'Name is too short').max(120),
  avatarUrl: z.union([z.string().url('Enter a valid image URL'), z.literal('')]),
});
const passwordSchema = z.object({
  currentPassword: z.string().min(1, 'Required'),
  newPassword: z.string().min(8, 'At least 8 characters'),
});

export default function Profile() {
  const { user } = useAuth();
  const { memberships } = useOrg();
  const [updateProfile, { isLoading: savingProfile }] = useUpdateProfileMutation();
  const [changePassword, { isLoading: changingPw }] = useChangePasswordMutation();

  const {
    register: rp,
    handleSubmit: submitProfile,
    watch,
    formState: { errors: pe, isDirty: profileDirty },
  } = useForm({
    resolver: zodResolver(profileSchema),
    values: { name: user?.name || '', avatarUrl: user?.avatar?.url || '' },
  });

  const {
    register: rpw,
    handleSubmit: submitPassword,
    reset: resetPw,
    formState: { errors: we },
  } = useForm({ resolver: zodResolver(passwordSchema) });

  const previewName = watch('name') || user?.name;
  const previewUrl = watch('avatarUrl');

  const onSaveProfile = async (values) => {
    try {
      await updateProfile({ name: values.name.trim(), avatarUrl: values.avatarUrl }).unwrap();
      toast.success('Profile updated');
    } catch (err) {
      toast.error(getApiErrorMessage(err));
    }
  };

  const onChangePassword = async (values) => {
    try {
      await changePassword(values).unwrap();
      toast.success('Password changed.');
      resetPw();
    } catch (err) {
      toast.error(getApiErrorMessage(err));
    }
  };

  return (
    <>
      <PageMeta title="Profile" />
      <PageHeader title="Your profile" description="Manage your account details and security." />

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Edit profile */}
        <Card className="p-6">
          <h2 className="mb-4 text-sm font-semibold text-gray-900 dark:text-gray-100">Profile details</h2>
          <form onSubmit={submitProfile(onSaveProfile)} className="space-y-4">
            <div className="flex items-center gap-4">
              <Avatar name={previewName} src={previewUrl || undefined} size="lg" />
              <div className="min-w-0">
                <p className="truncate text-sm font-medium text-gray-900 dark:text-gray-100">{previewName}</p>
                <p className="truncate text-xs text-gray-400">{user?.email}</p>
              </div>
            </div>

            <Input label="Full name" id="name" error={pe.name?.message} {...rp('name')} />
            <Input
              label="Avatar image URL"
              id="avatarUrl"
              placeholder="https://…  (leave blank to use initials)"
              error={pe.avatarUrl?.message}
              {...rp('avatarUrl')}
            />
            <Input label="Email" value={user?.email || ''} disabled readOnly />

            <div className="flex items-center gap-3 pt-1">
              <Button type="submit" isLoading={savingProfile} disabled={!profileDirty}>
                Save changes
              </Button>
              <span className="text-xs text-gray-400">
                {user?.isEmailVerified ? 'Email verified' : 'Email not verified'} · Last login{' '}
                {formatDateTime(user?.lastLoginAt) || '—'}
              </span>
            </div>
          </form>

          <div className="mt-6 border-t border-black/5 pt-4 dark:border-white/10">
            <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-gray-400">Organizations</p>
            <div className="flex flex-wrap gap-2">
              {memberships.map((m) => (
                <Badge key={m.organization.id} className={ROLE_META[m.role] || ROLE_META.member}>
                  {m.organization.name} · <span className="capitalize">{m.role}</span>
                </Badge>
              ))}
            </div>
          </div>
        </Card>

        {/* Change password */}
        <Card className="p-6">
          <h2 className="mb-4 text-sm font-semibold text-gray-900 dark:text-gray-100">Change password</h2>
          <form onSubmit={submitPassword(onChangePassword)} className="space-y-4">
            <Input
              label="Current password"
              type="password"
              id="currentPassword"
              autoComplete="current-password"
              error={we.currentPassword?.message}
              {...rpw('currentPassword')}
            />
            <Input
              label="New password"
              type="password"
              id="newPassword"
              autoComplete="new-password"
              error={we.newPassword?.message}
              {...rpw('newPassword')}
            />
            <Button type="submit" isLoading={changingPw}>
              Update password
            </Button>
          </form>
        </Card>
      </div>
    </>
  );
}
