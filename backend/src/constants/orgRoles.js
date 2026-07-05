/**
 * Organization-scoped roles. These are distinct from the platform-level
 * `roles` on the User model: authorization for all tenant data (teams, tasks,
 * members, reports) is driven by the caller's Membership.role in the active org.
 */
export const ORG_ROLES = Object.freeze({
  OWNER: 'owner',
  ADMIN: 'admin',
  MEMBER: 'member',
});

export const ORG_ROLE_VALUES = Object.freeze(Object.values(ORG_ROLES));

/** Privilege ordering — higher number = more capable. Used for role comparisons. */
export const ORG_ROLE_RANK = Object.freeze({
  [ORG_ROLES.MEMBER]: 1,
  [ORG_ROLES.ADMIN]: 2,
  [ORG_ROLES.OWNER]: 3,
});

export const MEMBERSHIP_STATUS = Object.freeze({
  ACTIVE: 'active',
  INVITED: 'invited',
  DISABLED: 'disabled',
});

export const MEMBERSHIP_STATUS_VALUES = Object.freeze(Object.values(MEMBERSHIP_STATUS));
