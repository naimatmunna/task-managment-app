import ApiError from '../utils/ApiError.js';
import { MESSAGES } from '../constants/messages.js';
import { roleHasPermission } from '../security/rbac.js';

/** Require the authenticated user to hold at least one of the given roles. */
export const requireRoles = (...roles) => (req, _res, next) => {
  if (!req.user) return next(ApiError.unauthorized(MESSAGES.AUTH.UNAUTHORIZED));
  const ok = req.user.roles.some((r) => roles.includes(r));
  return ok ? next() : next(ApiError.forbidden(MESSAGES.AUTH.FORBIDDEN));
};

/** Require the authenticated user's roles to grant every listed permission. */
export const requirePermissions = (...permissions) => (req, _res, next) => {
  if (!req.user) return next(ApiError.unauthorized(MESSAGES.AUTH.UNAUTHORIZED));
  const ok = permissions.every((p) => roleHasPermission(req.user.roles, p));
  return ok ? next() : next(ApiError.forbidden(MESSAGES.AUTH.FORBIDDEN));
};
