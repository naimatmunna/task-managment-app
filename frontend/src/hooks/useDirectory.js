import { useMemo } from 'react';
import { useMembersQuery } from '@/features/org/orgApi.js';
import { useTeamsQuery } from '@/features/teams/teamApi.js';

/**
 * Resolves the active org's people and teams into pick-lists and id→entity maps,
 * so task cards/forms can render assignee avatars and team chips without extra
 * round-trips. Backed by cached RTK Query data.
 */
export const useDirectory = () => {
  const { data: members } = useMembersQuery();
  const { data: teams } = useTeamsQuery();

  return useMemo(() => {
    const memberList = (members || [])
      .filter((m) => m.userId && m.status === 'active')
      .map((m) => ({ id: m.userId.id, name: m.userId.name, avatar: m.userId.avatar?.url, email: m.userId.email }));
    const teamList = (teams || []).map((t) => ({ id: t.id, name: t.name, color: t.color }));

    return {
      members: memberList,
      teams: teamList,
      memberById: Object.fromEntries(memberList.map((m) => [m.id, m])),
      teamById: Object.fromEntries(teamList.map((t) => [t.id, t])),
    };
  }, [members, teams]);
};
