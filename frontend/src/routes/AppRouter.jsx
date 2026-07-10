import { lazy, Suspense } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { ROUTES } from '@/constants';
import Spinner from '@/components/ui/Spinner.jsx';

import AuthLayout from '@/layouts/AuthLayout.jsx';
import DashboardLayout from '@/layouts/DashboardLayout.jsx';
import ProtectedRoute from './guards/ProtectedRoute.jsx';
import GuestRoute from './guards/GuestRoute.jsx';

// Auth screens are small and always needed early — import eagerly.
import Login from '@/pages/Login.jsx';
import Signup from '@/pages/Signup.jsx';
import VerifyOtp from '@/pages/VerifyOtp.jsx';
import ForgotPassword from '@/pages/ForgotPassword.jsx';
import ResetPassword from '@/pages/ResetPassword.jsx';
import AcceptInvite from '@/pages/AcceptInvite.jsx';

// App pages are code-split so heavy deps (recharts, dnd-kit) load on demand.
const Board = lazy(() => import('@/pages/Board.jsx'));
const TasksList = lazy(() => import('@/pages/TasksList.jsx'));
const TaskDetail = lazy(() => import('@/pages/TaskDetail.jsx'));
const Teams = lazy(() => import('@/pages/Teams.jsx'));
const Reports = lazy(() => import('@/pages/Reports.jsx'));
const ReleaseNotes = lazy(() => import('@/pages/ReleaseNotes.jsx'));
const Members = lazy(() => import('@/pages/Members.jsx'));
const Settings = lazy(() => import('@/pages/Settings.jsx'));
const Profile = lazy(() => import('@/pages/Profile.jsx'));
const NotFound = lazy(() => import('@/pages/NotFound.jsx'));

const Fallback = () => (
  <div className="flex h-64 items-center justify-center">
    <Spinner />
  </div>
);

export default function AppRouter() {
  return (
    <BrowserRouter>
      <Suspense fallback={<Fallback />}>
        <Routes>
          {/* Guest-only auth routes */}
          <Route element={<GuestRoute />}>
            <Route element={<AuthLayout />}>
              <Route path={ROUTES.LOGIN} element={<Login />} />
              <Route path={ROUTES.SIGNUP} element={<Signup />} />
              <Route path={ROUTES.VERIFY_OTP} element={<VerifyOtp />} />
              <Route path={ROUTES.FORGOT_PASSWORD} element={<ForgotPassword />} />
              <Route path={ROUTES.RESET_PASSWORD} element={<ResetPassword />} />
            </Route>
          </Route>

          {/* Invite acceptance is reachable while logged out */}
          <Route element={<AuthLayout />}>
            <Route path={ROUTES.ACCEPT_INVITE} element={<AcceptInvite />} />
          </Route>

          {/* Authenticated application */}
          <Route element={<ProtectedRoute />}>
            <Route path={ROUTES.APP} element={<DashboardLayout />}>
              <Route index element={<Navigate to={ROUTES.BOARD} replace />} />
              <Route path={ROUTES.BOARD} element={<Board />} />
              <Route path={ROUTES.LIST} element={<TasksList />} />
              <Route path={ROUTES.TASK} element={<TaskDetail />} />
              <Route path={ROUTES.TEAMS} element={<Teams />} />
              <Route path={ROUTES.REPORTS} element={<Reports />} />
              <Route path={ROUTES.RELEASES} element={<ReleaseNotes />} />
              <Route path={ROUTES.MEMBERS} element={<Members />} />
              <Route path={ROUTES.SETTINGS} element={<Settings />} />
              <Route path={ROUTES.PROFILE} element={<Profile />} />
            </Route>
          </Route>

          {/* Root → app (bounces to /login when unauthenticated) */}
          <Route path={ROUTES.HOME} element={<Navigate to={ROUTES.APP} replace />} />
          <Route path={ROUTES.NOT_FOUND} element={<NotFound />} />
          <Route path="*" element={<Navigate to={ROUTES.NOT_FOUND} replace />} />
        </Routes>
      </Suspense>
    </BrowserRouter>
  );
}
