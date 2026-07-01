/**
 * Granular permissions in `resource:action` form.
 * Roles map to sets of these (see security/rbac.js), so you can grant
 * fine-grained access without inventing new roles.
 */
export const PERMISSIONS = Object.freeze({
  USER_CREATE: 'user:create',
  USER_READ: 'user:read',
  USER_UPDATE: 'user:update',
  USER_DELETE: 'user:delete',
  USER_MANAGE_ROLES: 'user:manage_roles',

  AUDIT_READ: 'audit:read',
  SETTINGS_READ: 'settings:read',
  SETTINGS_UPDATE: 'settings:update',
});

export const PERMISSION_VALUES = Object.freeze(Object.values(PERMISSIONS));
