import { useSelector } from 'react-redux';
import {
  selectCurrentUser,
  selectIsAuthenticated,
  selectUserRoles,
} from '@/features/auth/authSlice.js';

/** Read-only auth state accessor. */
export const useAuth = () => ({
  user: useSelector(selectCurrentUser),
  isAuthenticated: useSelector(selectIsAuthenticated),
  roles: useSelector(selectUserRoles),
});
