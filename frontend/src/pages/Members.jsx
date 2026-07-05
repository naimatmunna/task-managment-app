import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import toast from 'react-hot-toast';
import { UserPlus, Trash2, MailPlus } from 'lucide-react';
import {
  useMembersQuery,
  useInviteMemberMutation,
  useUpdateMemberRoleMutation,
  useRemoveMemberMutation,
} from '@/features/org/orgApi.js';
import { useOrg } from '@/hooks/useOrg.js';
import { useAuth } from '@/hooks/useAuth.js';
import { getApiErrorMessage } from '@/helpers/apiError.js';
import { formatDateTime } from '@/helpers/format.js';
import { ROLE_META, MEMBER_STATUS_META } from '@/constants';
import { cn } from '@/lib/classNames.js';
import PageHeader from '@/components/app/PageHeader.jsx';
import PageMeta from '@/components/common/PageMeta.jsx';
import Card from '@/components/ui/Card.jsx';
import Button from '@/components/ui/Button.jsx';
import Input from '@/components/ui/Input.jsx';
import Select from '@/components/ui/Select.jsx';
import Modal from '@/components/ui/Modal.jsx';
import Badge from '@/components/ui/Badge.jsx';
import Avatar from '@/components/ui/Avatar.jsx';
import EmptyState from '@/components/ui/EmptyState.jsx';
import Skeleton from '@/components/ui/Skeleton.jsx';

const inviteSchema = z.object({
  email: z.string().email('Enter a valid email'),
  role: z.enum(['member', 'admin']),
});

function InviteModal({ open, onClose }) {
  const [invite, { isLoading }] = useInviteMemberMutation();
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm({ resolver: zodResolver(inviteSchema), defaultValues: { role: 'member' } });

  const onSubmit = async (values) => {
    try {
      const res = await invite(values).unwrap();
      toast.success(`Invitation sent to ${values.email}`);
      if (res.data?.devToken) {
        // Dev convenience when SMTP isn't configured.
        toast(`Dev invite link: /accept-invite?token=${res.data.devToken}`, { duration: 8000 });
      }
      reset();
      onClose();
    } catch (err) {
      toast.error(getApiErrorMessage(err));
    }
  };

  return (
    <Modal open={open} onClose={onClose} title="Invite a teammate">
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <Input label="Email" type="email" id="invite-email" placeholder="teammate@company.com" error={errors.email?.message} {...register('email')} />
        <Select label="Role" id="invite-role" error={errors.role?.message} {...register('role')}>
          <option value="member">Member — create & manage tasks</option>
          <option value="admin">Admin — manage members, teams & all tasks</option>
        </Select>
        <div className="flex justify-end gap-2 pt-2">
          <Button type="button" variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" isLoading={isLoading}>
            <MailPlus className="h-4 w-4" /> Send invite
          </Button>
        </div>
      </form>
    </Modal>
  );
}

export default function Members() {
  const { data: members, isLoading } = useMembersQuery();
  const { canManage } = useOrg();
  const { user } = useAuth();
  const [updateRole] = useUpdateMemberRoleMutation();
  const [removeMember] = useRemoveMemberMutation();
  const [inviteOpen, setInviteOpen] = useState(false);

  const onRole = async (id, role) => {
    try {
      await updateRole({ id, role }).unwrap();
      toast.success('Role updated');
    } catch (err) {
      toast.error(getApiErrorMessage(err));
    }
  };

  const onRemove = async (m) => {
    const label = m.userId?.name || m.invitedEmail;
    if (!window.confirm(`Remove ${label} from this organization?`)) return;
    try {
      await removeMember(m.id).unwrap();
      toast.success('Member removed');
    } catch (err) {
      toast.error(getApiErrorMessage(err));
    }
  };

  return (
    <>
      <PageMeta title="Members" />
      <PageHeader
        title="Members"
        description="People with access to this organization."
        actions={
          canManage && (
            <Button onClick={() => setInviteOpen(true)}>
              <UserPlus className="h-4 w-4" /> Invite
            </Button>
          )
        }
      />

      <Card className="overflow-hidden">
        {isLoading ? (
          <div className="space-y-2 p-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className="h-12 w-full" />
            ))}
          </div>
        ) : !members?.length ? (
          <EmptyState icon={UserPlus} title="No members yet" description="Invite teammates to collaborate." />
        ) : (
          <div className="max-h-[calc(100vh-16rem)] overflow-auto">
            <table className="w-full text-sm">
              <thead className="sticky top-0 z-10 border-b border-gray-200/70 bg-white text-left text-xs uppercase tracking-wide text-gray-400 [&_th]:bg-white dark:border-white/10 dark:bg-gray-900 dark:[&_th]:bg-gray-900">
                <tr>
                  <th className="px-4 py-3 font-medium">Member</th>
                  <th className="px-4 py-3 font-medium">Role</th>
                  <th className="px-4 py-3 font-medium">Status</th>
                  <th className="px-4 py-3 font-medium">Last active</th>
                  {canManage && <th className="px-4 py-3" />}
                </tr>
              </thead>
              <tbody className="divide-y divide-black/5 dark:divide-white/10">
                {members.map((m) => {
                  const person = m.userId;
                  const name = person?.name || m.invitedEmail;
                  const email = person?.email || m.invitedEmail;
                  const isSelf = person && person.id === user?.id;
                  const isOwner = m.role === 'owner';
                  return (
                    <tr key={m.id} className="hover:bg-gray-50/60 dark:hover:bg-gray-800/40">
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-3">
                          <Avatar name={name} src={person?.avatar?.url} size="sm" />
                          <div className="min-w-0">
                            <div className="truncate font-medium text-gray-900 dark:text-gray-100">
                              {name} {isSelf && <span className="text-xs text-gray-400">(you)</span>}
                            </div>
                            <div className="truncate text-xs text-gray-400">{email}</div>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        {canManage && !isOwner ? (
                          <select
                            value={m.role}
                            onChange={(e) => onRole(m.id, e.target.value)}
                            className="rounded-md border border-gray-300 bg-white px-2 py-1 text-xs dark:border-gray-700 dark:bg-gray-800"
                          >
                            <option value="member">Member</option>
                            <option value="admin">Admin</option>
                          </select>
                        ) : (
                          <Badge className={cn('capitalize', ROLE_META[m.role])}>{m.role}</Badge>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <Badge className={cn('capitalize', MEMBER_STATUS_META[m.status] || MEMBER_STATUS_META.active)}>
                          {m.status}
                        </Badge>
                      </td>
                      <td className="px-4 py-3 text-gray-500">
                        {person?.lastLoginAt ? formatDateTime(person.lastLoginAt) : '—'}
                      </td>
                      {canManage && (
                        <td className="px-4 py-3 text-right">
                          {!isOwner && !isSelf && (
                            <button
                              onClick={() => onRemove(m)}
                              className="rounded-md p-1.5 text-gray-400 transition hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-900/20"
                              aria-label="Remove member"
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          )}
                        </td>
                      )}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      <InviteModal open={inviteOpen} onClose={() => setInviteOpen(false)} />
    </>
  );
}
