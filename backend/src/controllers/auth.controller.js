import catchAsync from '../utils/catchAsync.js';
import ApiResponse from '../utils/ApiResponse.js';
import authService from '../services/auth.service.js';
import config from '../config/index.js';
import { MESSAGES } from '../constants/messages.js';
import { OTP_PURPOSE } from '../constants/otp.js';
import { setRefreshCookie, clearRefreshCookie, readRefreshCookie } from '../helpers/cookie.js';

export const signup = catchAsync(async (req, res) => {
  const { user, organization, devCode } = await authService.signup(req.body);
  return ApiResponse.created(res, {
    message: MESSAGES.AUTH.SIGNED_UP,
    data: { user, organization, email: user.email, devCode },
  });
});

export const verifyOtp = catchAsync(async (req, res) => {
  const { user, tokens, memberships } = await authService.verifyOtp(req.body);
  setRefreshCookie(res, tokens.refreshToken);
  return ApiResponse.send(res, {
    message: MESSAGES.AUTH.EMAIL_VERIFIED,
    data: { user, accessToken: tokens.accessToken, memberships },
  });
});

export const resendOtp = catchAsync(async (req, res) => {
  await authService.resendOtp(req.body);
  return ApiResponse.send(res, { message: MESSAGES.AUTH.OTP_RESENT });
});

export const login = catchAsync(async (req, res) => {
  const result = await authService.login(req.body);

  // Optional second-factor path: no tokens issued yet.
  if (result.otpRequired) {
    return ApiResponse.send(res, {
      message: MESSAGES.AUTH.OTP_SENT,
      data: { otpRequired: true, email: result.email, devCode: result.devCode },
    });
  }

  setRefreshCookie(res, result.tokens.refreshToken);
  return ApiResponse.send(res, {
    message: MESSAGES.AUTH.LOGGED_IN,
    data: { user: result.user, accessToken: result.tokens.accessToken, memberships: result.memberships },
  });
});

export const verifyLoginOtp = catchAsync(async (req, res) => {
  const { user, tokens, memberships } = await authService.verifyLoginOtp(req.body);
  setRefreshCookie(res, tokens.refreshToken);
  return ApiResponse.send(res, {
    message: MESSAGES.AUTH.LOGGED_IN,
    data: { user, accessToken: tokens.accessToken, memberships },
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
  // Best-effort dev hint so the reset flow is testable without SMTP.
  const data = config.isProd ? undefined : { purpose: OTP_PURPOSE.RESET };
  return ApiResponse.send(res, { message: MESSAGES.AUTH.RESET_EMAIL_SENT, data });
});

export const resetPassword = catchAsync(async (req, res) => {
  await authService.resetPassword(req.body);
  return ApiResponse.send(res, { message: MESSAGES.AUTH.PASSWORD_RESET });
});

export const changePassword = catchAsync(async (req, res) => {
  await authService.changePassword({ userId: req.user.id, ...req.body });
  clearRefreshCookie(res);
  return ApiResponse.send(res, { message: MESSAGES.AUTH.PASSWORD_CHANGED });
});

export const me = catchAsync(async (req, res) => {
  const { user, memberships } = await authService.me(req.user.id);
  return ApiResponse.send(res, { data: { user, memberships } });
});
