import { useState, useMemo } from 'react';
import toast from 'react-hot-toast';
import { Plus, Pencil, Trash2, Users2, Crown } from 'lucide-react';
import {
  useTeamsQuery,
  useCreateTeamMutation,
  useUpdateTeamMutation,
  useDeleteTeamMutation,
} from '@/features/teams/teamApi.js';
import { useMembersQuery } from '@/features/org/orgApi.js';
import { useOrg } from '@/hooks/useOrg.js';
import { getApiErrorMessage } from '@/helpers/apiError.js';
import PageHeader from '@/components/app/PageHeader.jsx';
import PageMeta from '@/components/common/PageMeta.jsx';
import Card from '@/components/ui/Card.jsx';
import Button from '@/components/ui/Button.jsx';
import Input from '@/components/ui/Input.jsx';
import Select from '@/components/ui/Select.jsx';
import Modal from '@/components/ui/Modal.jsx';
import Avatar from '@/components/ui/Avatar.jsx';
import EmptyState from '@/components/ui/EmptyState.jsx';
import Skeleton from '@/components/ui/Skeleton.jsx';
import Pagination from '@/components/ui/Pagination.jsx';
import { useClientPagination } from '@/hooks/useClientPagination.js';
import { cn } from '@/lib/classNames.js';

const SWATCHES = ['#6366f1', '#0ea5e9', '#10b981', '#f59e0b', '#ef4444', '#ec4899', '#8b5cf6', '#64748b'];

function TeamModal({ open, onClose, team, memberOptions }) {
  const editing = Boolean(team);
  const [create, { isLoading: creating }] = useCreateTeamMutation();
  const [update, { isLoading: updating }] = useUpdateTeamMutation();

  const [name, setName] = useState(team?.name || '');
  const [description, setDescription] = useState(team?.description || '');
  const [color, setColor] = useState(team?.color || SWATCHES[0]);
  const [memberIds, setMemberIds] = useState(team?.memberIds?.map(String) || []);
  const [leadId, setLeadId] = useState(team?.leadId ? String(team.leadId) : '');

  const toggleMember = (id) =>
    setMemberIds((cur) => (cur.includes(id) ? cur.filter((x) => x !== id) : [...cur, id]));

  const onSubmit = async (e) => {
    e.preventDefault();
    if (name.trim().length < 1) return toast.error('Team name is required');
    const body = { name: name.trim(), description, color, memberIds, leadId: leadId || null };
    try {
      if (editing) await update({ id: team.id, ...body }).unwrap();
      else await create(body).unwrap();
      toast.success(editing ? 'Team updated' : 'Team created');
      onClose();
    } catch (err) {
      toast.error(getApiErrorMessage(err));
    }
    return undefined;
  };

  return (
    <Modal open={open} onClose={onClose} title={editing ? 'Edit team' : 'Create team'}>
      <form onSubmit={onSubmit} className="space-y-4">
        <Input label="Name" value={name} onChange={(e) => setName(e.target.value)} placeholder="Engineering" />
        <Input label="Description" value={description} onChange={(e) => setDescription(e.target.value)} placeholder="What this team owns" />

        <div>
          <span className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">Colour</span>
          <div className="flex flex-wrap gap-2">
            {SWATCHES.map((c) => (
              <button
                key={c}
                type="button"
                onClick={() => setColor(c)}
                style={{ backgroundColor: c }}
                className={cn('h-7 w-7 rounded-full ring-offset-2 transition dark:ring-offset-gray-800', color === c && 'ring-2 ring-gray-900 dark:ring-white')}
                aria-label={`Colour ${c}`}
              />
            ))}
          </div>
        </div>

        <div>
          <span className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">Members</span>
          <div className="max-h-40 space-y-1 overflow-y-auto rounded-lg border border-gray-200 p-2 dark:border-gray-700">
            {memberOptions.length === 0 && <p className="px-1 py-2 text-sm text-gray-400">No members yet.</p>}
            {memberOptions.map((m) => (
              <label key={m.userId} className="flex cursor-pointer items-center gap-2 rounded px-1 py-1 text-sm hover:bg-gray-50 dark:hover:bg-gray-700/50">
                <input type="checkbox" checked={memberIds.includes(m.userId)} onChange={() => toggleMember(m.userId)} className="rounded" />
                <Avatar name={m.name} size="xs" />
                {m.name}
              </label>
            ))}
          </div>
        </div>

        <Select label="Team lead" value={leadId} onChange={(e) => setLeadId(e.target.value)}>
          <option value="">No lead</option>
          {memberOptions.map((m) => (
            <option key={m.userId} value={m.userId}>
              {m.name}
            </option>
          ))}
        </Select>

        <div className="flex justify-end gap-2 pt-2">
          <Button type="button" variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" isLoading={creating || updating}>
            {editing ? 'Save' : 'Create team'}
          </Button>
        </div>
      </form>
    </Modal>
  );
}

export default function Teams() {
  const { data: teams, isLoading } = useTeamsQuery();
  const { data: members } = useMembersQuery();
  const { canManage } = useOrg();
  const [deleteTeam] = useDeleteTeamMutation();
  const [modal, setModal] = useState({ open: false, team: null });

  // Active members (id + name) for pickers and for resolving team rosters.
  const memberOptions = useMemo(
    () =>
      (members || [])
        .filter((m) => m.userId && m.status === 'active')
        .map((m) => ({ userId: m.userId.id, name: m.userId.name, avatar: m.userId.avatar?.url })),
    [members],
  );
  const nameById = useMemo(
    () => Object.fromEntries(memberOptions.map((m) => [m.userId, m])),
    [memberOptions],
  );
  const pag = useClientPagination(teams || [], 9);

  const onDelete = async (team) => {
    if (!window.confirm(`Delete team "${team.name}"? Tasks stay but lose their team.`)) return;
    try {
      await deleteTeam(team.id).unwrap();
      toast.success('Team deleted');
    } catch (err) {
      toast.error(getApiErrorMessage(err));
    }
  };

  return (
    <>
      <PageMeta title="Teams" />
      <PageHeader
        title="Teams"
        description="Group members to organize work."
        actions={
          canManage && (
            <Button onClick={() => setModal({ open: true, team: null })}>
              <Plus className="h-4 w-4" /> New team
            </Button>
          )
        }
      />

      {isLoading ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-40 w-full" />
          ))}
        </div>
      ) : !teams?.length ? (
        <EmptyState
          icon={Users2}
          title="No teams yet"
          description="Create your first team to organize members and work."
          action={canManage && <Button onClick={() => setModal({ open: true, team: null })}><Plus className="h-4 w-4" /> New team</Button>}
        />
      ) : (
        <>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {pag.pageItems.map((team) => {
            const lead = team.leadId ? nameById[String(team.leadId)] : null;
            return (
              <Card key={team.id} className="flex flex-col p-5">
                <div className="mb-3 flex items-start justify-between">
                  <div className="flex items-center gap-2.5">
                    <span className="h-3 w-3 rounded-full" style={{ backgroundColor: team.color }} />
                    <h3 className="font-semibold text-gray-900 dark:text-gray-100">{team.name}</h3>
                  </div>
                  {canManage && (
                    <div className="flex gap-1">
                      <button onClick={() => setModal({ open: true, team })} className="rounded-md p-1.5 text-gray-400 hover:bg-gray-100 hover:text-gray-700 dark:hover:bg-gray-800" aria-label="Edit team">
                        <Pencil className="h-4 w-4" />
                      </button>
                      <button onClick={() => onDelete(team)} className="rounded-md p-1.5 text-gray-400 hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-900/20" aria-label="Delete team">
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  )}
                </div>
                {team.description && (
                  <p className="mb-4 line-clamp-2 text-sm text-gray-500 dark:text-gray-400">{team.description}</p>
                )}
                <div className="mt-auto flex items-center justify-between">
                  <div className="flex -space-x-2">
                    {(team.memberIds || []).slice(0, 5).map((id) => {
                      const m = nameById[String(id)];
                      return m ? <Avatar key={id} name={m.name} src={m.avatar} size="sm" /> : null;
                    })}
                    {(team.memberIds?.length || 0) > 5 && (
                      <span className="flex h-7 w-7 items-center justify-center rounded-full bg-gray-100 text-xs font-medium text-gray-500 ring-2 ring-white dark:bg-gray-800 dark:ring-gray-900">
                        +{team.memberIds.length - 5}
                      </span>
                    )}
                    {!team.memberIds?.length && <span className="text-xs text-gray-400">No members</span>}
                  </div>
                  {lead && (
                    <span className="flex items-center gap-1 text-xs text-gray-400">
                      <Crown className="h-3.5 w-3.5" /> {lead.name}
                    </span>
                  )}
                </div>
              </Card>
            );
          })}
        </div>
        <Pagination
          page={pag.page}
          pageSize={pag.pageSize}
          total={pag.total}
          totalPages={pag.totalPages}
          onChange={pag.setPage}
          onPageSizeChange={pag.setPageSize}
          pageSizeOptions={[9, 18, 36]}
          label="teams"
        />
        </>
      )}

      {modal.open && (
        <TeamModal
          key={modal.team?.id || 'new'}
          open={modal.open}
          team={modal.team}
          memberOptions={memberOptions}
          onClose={() => setModal({ open: false, team: null })}
        />
      )}
    </>
  );
}
