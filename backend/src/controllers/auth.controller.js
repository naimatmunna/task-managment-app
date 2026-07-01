import catchAsync from '../utils/catchAsync.js';
import ApiResponse from '../utils/ApiResponse.js';
import authService from '../services/auth.service.js';
import { MESSAGES } from '../constants/messages.js';
import { setRefreshCookie, clearRefreshCookie, readRefreshCookie } from '../helpers/cookie.js';

export const register = catchAsync(async (req, res) => {
  const user = await authService.register(req.body);
  return ApiResponse.created(res, { message: MESSAGES.AUTH.REGISTERED, data: { user } });
});

export const login = catchAsync(async (req, res) => {
  const { user, tokens } = await authService.login(req.body);
  setRefreshCookie(res, tokens.refreshToken);
  return ApiResponse.send(res, {
    message: MESSAGES.AUTH.LOGGED_IN,
    data: { user, accessToken: tokens.accessToken },
  });
});

export const refresh = catchAsync(async (req, res) => {
  const tokens = await authService.refresh(readRefreshCookie(req));
  setRefreshCookie(res, tokens.refreshToken);
  return ApiResponse.send(res, {
    message: MESSAGES.AUTH.TOKEN_REFRESHED,
    data: { accessToken: tokens.accessToken },
  });
});

export const logout = catchAsync(async (req, res) => {
  await authService.logout(req.user.id, readRefreshCookie(req));
  clearRefreshCookie(res);
  return ApiResponse.send(res, { message: MESSAGES.AUTH.LOGGED_OUT });
});

export const forgotPassword = catchAsync(async (req, res) => {
  await authService.forgotPassword(req.body.email);
  return ApiResponse.send(res, { message: MESSAGES.AUTH.RESET_EMAIL_SENT });
});

export const resetPassword = catchAsync(async (req, res) => {
  await authService.resetPassword(req.body);
  return ApiResponse.send(res, { message: MESSAGES.AUTH.PASSWORD_RESET });
});

export const verifyEmail = catchAsync(async (req, res) => {
  await authService.verifyEmail(req.body.token);
  return ApiResponse.send(res, { message: MESSAGES.AUTH.EMAIL_VERIFIED });
});

export const changePassword = catchAsync(async (req, res) => {
  await authService.changePassword({ userId: req.user.id, ...req.body });
  clearRefreshCookie(res);
  return ApiResponse.send(res, { message: MESSAGES.AUTH.PASSWORD_CHANGED });
});

export const me = catchAsync(async (req, res) => {
  return ApiResponse.send(res, { data: { user: req.user } });
});
