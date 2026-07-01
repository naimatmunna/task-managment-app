import { ROLES } from '../constants/roles.js';
import { PERMISSIONS, PERMISSION_VALUES } from '../constants/permissions.js';

/**
 * Role -> permission mapping. Super admin implicitly holds every permission.
 * Keep this the single source of authority; middleware reads from it.
 */
const P = PERMISSIONS;

export const ROLE_PERMISSIONS = Object.freeze({
  [ROLES.SUPER_ADMIN]: PERMISSION_VALUES,
  [ROLES.ADMIN]: [
    P.USER_CREATE, P.USER_READ, P.USER_UPDATE, P.USER_DELETE, P.USER_MANAGE_ROLES,
    P.AUDIT_READ, P.SETTINGS_READ, P.SETTINGS_UPDATE,
  ],
  [ROLES.MANAGER]: [P.USER_READ, P.USER_UPDATE, P.SETTINGS_READ],
  [ROLES.USER]: [P.USER_READ],
});

export const getPermissionsForRoles = (roles = []) => {
  const set = new Set();
  roles.forEach((role) => (ROLE_PERMISSIONS[role] || []).forEach((p) => set.add(p)));
  return [...set];
};

export const roleHasPermission = (roles = [], permission) =>
  getPermissionsForRoles(roles).includes(permission);
