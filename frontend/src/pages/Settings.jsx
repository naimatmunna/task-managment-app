import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import toast from 'react-hot-toast';
import { useCurrentOrgQuery, useUpdateOrgMutation } from '@/features/org/orgApi.js';
import { useOrg } from '@/hooks/useOrg.js';
import { getApiErrorMessage } from '@/helpers/apiError.js';
import PageHeader from '@/components/app/PageHeader.jsx';
import PageMeta from '@/components/common/PageMeta.jsx';
import Card from '@/components/ui/Card.jsx';
import Input from '@/components/ui/Input.jsx';
import Select from '@/components/ui/Select.jsx';
import Button from '@/components/ui/Button.jsx';
import Skeleton from '@/components/ui/Skeleton.jsx';

const schema = z.object({
  name: z.string().min(2, 'Name is too short'),
  timezone: z.string().min(1),
});

// A reasonable timezone list; falls back if Intl.supportedValuesOf is unavailable.
const TIMEZONES = (() => {
  try {
    return Intl.supportedValuesOf('timeZone');
  } catch {
    return ['UTC', 'America/New_York', 'America/Los_Angeles', 'Europe/London', 'Asia/Singapore'];
  }
})();

export default function Settings() {
  const { data, isLoading } = useCurrentOrgQuery();
  const { canManage } = useOrg();
  const [updateOrg, { isLoading: saving }] = useUpdateOrgMutation();
  const org = data?.data?.organization;

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isDirty },
  } = useForm({ resolver: zodResolver(schema) });

  useEffect(() => {
    if (org) reset({ name: org.name, timezone: org.settings?.timezone || 'UTC' });
  }, [org, reset]);

  const onSubmit = async (values) => {
    try {
      await updateOrg({ name: values.name, settings: { timezone: values.timezone } }).unwrap();
      toast.success('Settings saved');
    } catch (err) {
      toast.error(getApiErrorMessage(err));
    }
  };

  return (
    <>
      <PageMeta title="Settings" />
      <PageHeader title="Organization settings" description="Manage your workspace preferences." />

      <Card className="max-w-xl p-6">
        {isLoading ? (
          <div className="space-y-4">
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
          </div>
        ) : (
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <Input label="Organization name" id="name" disabled={!canManage} error={errors.name?.message} {...register('name')} />
            <Select label="Timezone" id="timezone" disabled={!canManage} error={errors.timezone?.message} {...register('timezone')}>
              {TIMEZONES.map((tz) => (
                <option key={tz} value={tz}>
                  {tz}
                </option>
              ))}
            </Select>
            {org?.slug && (
              <p className="text-xs text-gray-400">
                Workspace URL slug: <span className="font-mono">{org.slug}</span>
              </p>
            )}
            {canManage ? (
              <Button type="submit" isLoading={saving} disabled={!isDirty}>
                Save changes
              </Button>
            ) : (
              <p className="text-sm text-gray-400">Only owners and admins can change settings.</p>
            )}
          </form>
        )}
      </Card>
    </>
  );
}
