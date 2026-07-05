import { useSelector } from 'react-redux';
import {
  selectMemberships,
  selectActiveOrg,
  selectActiveRole,
  selectActiveOrgId,
} from '@/features/org/orgSlice.js';
import { ORG_ROLE_RANK } from '@/constants';

/**
 * Active-organization accessor + role helpers. Client-side gating is UX only;
 * the server re-checks membership role on every request.
 */
export const useOrg = () => {
  const memberships = useSelector(selectMemberships);
  const org = useSelector(selectActiveOrg);
  const role = useSelector(selectActiveRole);
  const orgId = useSelector(selectActiveOrgId);

  const rank = ORG_ROLE_RANK[role] || 0;
  return {
    memberships,
    org,
    orgId,
    role,
    isOwner: role === 'owner',
    isAdmin: rank >= ORG_ROLE_RANK.admin, // owner or admin
    canManage: rank >= ORG_ROLE_RANK.admin,
  };
};
