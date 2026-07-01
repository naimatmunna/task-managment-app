import { useAuth } from './useAuth.js';
import { ROLES } from '@/constants';

/**
 * Client-side role gate. NOTE: this is UX only — the server is the source of
 * truth for authorization. Never rely on this to protect data.
 */
export const usePermissions = () => {
  const { roles } = useAuth();
  const hasRole = (...allowed) => roles.some((r) => allowed.includes(r));
  const isAdmin = hasRole(ROLES.ADMIN, ROLES.SUPER_ADMIN);
  return { roles, hasRole, isAdmin };
};
