import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth.js';
import { ROUTES } from '@/constants';

/** For auth pages — redirects already-authenticated users into the app. */
export default function GuestRoute() {
  const { isAuthenticated } = useAuth();
  return isAuthenticated ? <Navigate to={ROUTES.APP} replace /> : <Outlet />;
}
