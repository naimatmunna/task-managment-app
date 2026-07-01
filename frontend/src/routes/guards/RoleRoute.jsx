import { Navigate, Outlet } from 'react-router-dom';
import { usePermissions } from '@/hooks/usePermissions.js';
import { ROUTES } from '@/constants';

/** Restricts a branch to specific roles (client-side UX gate). */
export default function RoleRoute({ allowed = [] }) {
  const { hasRole } = usePermissions();
  return hasRole(...allowed) ? <Outlet /> : <Navigate to={ROUTES.DASHBOARD} replace />;
}
