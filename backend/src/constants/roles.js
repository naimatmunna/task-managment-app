/** System roles. Extend freely — permissions are role-driven via RBAC. */
export const ROLES = Object.freeze({
  SUPER_ADMIN: 'super_admin',
  ADMIN: 'admin',
  MANAGER: 'manager',
  USER: 'user',
});

export const ROLE_VALUES = Object.freeze(Object.values(ROLES));
