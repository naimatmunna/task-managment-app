import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { ROUTES, ROLES } from '@/constants';

import AuthLayout from '@/layouts/AuthLayout.jsx';
import DashboardLayout from '@/layouts/DashboardLayout.jsx';
import ProtectedRoute from './guards/ProtectedRoute.jsx';
import GuestRoute from './guards/GuestRoute.jsx';
import RoleRoute from './guards/RoleRoute.jsx';

import Landing from '@/pages/Landing.jsx';
import Login from '@/pages/Login.jsx';
import Register from '@/pages/Register.jsx';
import ForgotPassword from '@/pages/ForgotPassword.jsx';
import ResetPassword from '@/pages/ResetPassword.jsx';
import Dashboard from '@/pages/Dashboard.jsx';
import Users from '@/pages/Users.jsx';
import Profile from '@/pages/Profile.jsx';
import NotFound from '@/pages/NotFound.jsx';

export default function AppRouter() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path={ROUTES.HOME} element={<Landing />} />

        {/* Guest-only auth routes */}
        <Route element={<GuestRoute />}>
          <Route element={<AuthLayout />}>
            <Route path={ROUTES.LOGIN} element={<Login />} />
            <Route path={ROUTES.REGISTER} element={<Register />} />
            <Route path={ROUTES.FORGOT_PASSWORD} element={<ForgotPassword />} />
            <Route path={ROUTES.RESET_PASSWORD} element={<ResetPassword />} />
          </Route>
        </Route>

        {/* Authenticated dashboard */}
        <Route element={<ProtectedRoute />}>
          <Route element={<DashboardLayout />}>
            <Route path={ROUTES.DASHBOARD} element={<Dashboard />} />
            <Route path={ROUTES.PROFILE} element={<Profile />} />
            <Route element={<RoleRoute allowed={[ROLES.ADMIN, ROLES.SUPER_ADMIN]} />}>
              <Route path={ROUTES.USERS} element={<Users />} />
            </Route>
          </Route>
        </Route>

        <Route path={ROUTES.NOT_FOUND} element={<NotFound />} />
        <Route path="*" element={<Navigate to={ROUTES.NOT_FOUND} replace />} />
      </Routes>
    </BrowserRouter>
  );
}
