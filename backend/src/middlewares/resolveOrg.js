import ApiError from '../utils/ApiError.js';
import membershipRepository from '../repositories/membership.repository.js';
import { MEMBERSHIP_STATUS, ORG_ROLE_RANK } from '../constants/orgRoles.js';

/**
 * Multi-tenant boundary. Runs after `authenticate`. Resolves the active
 * organization from the `x-org-id` header (falling back to the user's first
 * active membership), verifies the caller has an ACTIVE membership there, and
 * attaches `req.orgId` + `req.membership`.
 *
 * Every tenant-scoped query MUST filter by `req.orgId`; this middleware is the
 * single place that authorizes a user↔org relationship, so a caller can never
 * act on an org they don't belong to.
 */
export const resolveOrg = async (req, _res, next) => {
  try {
    if (!req.user) throw ApiError.unauthorized();

    const headerOrgId = req.headers['x-org-id'];
    let membership;

    if (headerOrgId) {
      membership = await membershipRepository.findByUserAndOrg(req.user.id, headerOrgId);
      if (!membership) {
        // Do not distinguish "org doesn't exist" from "you're not a member".
        throw ApiError.forbidden('You do not have access to this organization', {
          code: 'ORG_ACCESS_DENIED',
        });
      }
    } else {
      // Default to the user's first active org when no header is supplied.
      const [first] = await membershipRepository.findActiveByUser(req.user.id);
      membership = first;
      if (!membership) {
        throw ApiError.forbidden('No active organization for this account', {
          code: 'NO_ACTIVE_ORG',
        });
      }
    }

    if (membership.status !== MEMBERSHIP_STATUS.ACTIVE) {
      throw ApiError.forbidden('Your membership in this organization is not active', {
        code: 'MEMBERSHIP_INACTIVE',
      });
    }

    req.orgId = String(membership.organizationId);
    req.membership = membership;
    next();
  } catch (err) {
    next(err);
  }
};

/**
 * Gate a route by org role. Pass the minimum required role; ownership rank is
 * used so `requireOrgRole('admin')` also admits owners.
 */
export const requireOrgRole = (minRole) => (req, _res, next) => {
  if (!req.membership) return next(ApiError.forbidden('Organization context missing'));
  const have = ORG_ROLE_RANK[req.membership.role] || 0;
  const need = ORG_ROLE_RANK[minRole] || 0;
  if (have < need) {
    return next(
      ApiError.forbidden('Your role does not permit this action', { code: 'INSUFFICIENT_ORG_ROLE' }),
    );
  }
  return next();
};
