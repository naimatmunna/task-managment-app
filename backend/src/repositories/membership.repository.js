import BaseRepository from './base.repository.js';
import Membership from '../models/membership.model.js';
import { MEMBERSHIP_STATUS } from '../constants/orgRoles.js';

class MembershipRepository extends BaseRepository {
  constructor() {
    super(Membership);
  }

  /** The caller's membership in a given org (any status). */
  findByUserAndOrg(userId, organizationId) {
    return this.model.findOne({ userId, organizationId }).exec();
  }

  /** All active orgs the user belongs to (used to pick a default active org). */
  findActiveByUser(userId) {
    return this.model
      .find({ userId, status: MEMBERSHIP_STATUS.ACTIVE })
      .sort({ createdAt: 1 })
      .exec();
  }

  /** Active memberships with their organization populated — for the org switcher / /me. */
  listOrgsForUser(userId) {
    return this.model
      .find({ userId, status: MEMBERSHIP_STATUS.ACTIVE })
      .populate('organizationId', 'name slug ownerId settings')
      .sort({ createdAt: 1 })
      .exec();
  }

  /** All memberships in an org (members list), newest first. */
  listByOrg(organizationId, filter = {}) {
    return this.model
      .find({ organizationId, ...filter })
      .populate('userId', 'name email avatar lastLoginAt')
      .sort({ createdAt: -1 })
      .exec();
  }

  findPendingByEmail(organizationId, invitedEmail) {
    return this.model
      .findOne({ organizationId, invitedEmail: invitedEmail?.toLowerCase() })
      .exec();
  }

  findByInviteToken(hashedToken) {
    return this.model
      .findOne({ inviteToken: hashedToken, inviteExpiresAt: { $gt: new Date() } })
      .select('+inviteToken')
      .exec();
  }

  countByOrg(organizationId, filter = {}) {
    return this.model.countDocuments({ organizationId, ...filter });
  }

  /** Set of active member userId strings in an org — for validating team rosters. */
  async activeUserIds(organizationId) {
    const rows = await this.model
      .find({ organizationId, status: MEMBERSHIP_STATUS.ACTIVE, userId: { $ne: null } })
      .select('userId')
      .lean()
      .exec();
    return new Set(rows.map((r) => String(r.userId)));
  }
}

export default new MembershipRepository();
