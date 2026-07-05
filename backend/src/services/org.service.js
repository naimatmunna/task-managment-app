import organizationRepository from '../repositories/organization.repository.js';
import membershipRepository from '../repositories/membership.repository.js';
import userRepository from '../repositories/user.repository.js';
import tokenService from './token.service.js';
import emailService from './email.service.js';
import authService from './auth.service.js';
import ApiError from '../utils/ApiError.js';
import config from '../config/index.js';
import { createHashedToken, hashToken } from '../utils/crypto.js';
import { ORG_ROLES, MEMBERSHIP_STATUS } from '../constants/orgRoles.js';

const DAY = 24 * 60 * 60 * 1000;

/**
 * Organization + membership + invitation use-cases. All operations are scoped
 * to a single organization id supplied by the resolveOrg middleware; role gates
 * are enforced at the route layer (requireOrgRole) and re-checked here where the
 * rule depends on the target (e.g. never touch the owner membership).
 */
class OrgService {
  /** Create an additional organization owned by the caller. */
  async createOrg(userId, { name }) {
    const slug = await organizationRepository.generateUniqueSlug(name);
    const org = await organizationRepository.create({ name, slug, ownerId: userId });
    await membershipRepository.create({
      organizationId: org.id,
      userId,
      role: ORG_ROLES.OWNER,
      status: MEMBERSHIP_STATUS.ACTIVE,
    });
    return org;
  }

  async getOrg(orgId) {
    const org = await organizationRepository.findById(orgId);
    if (!org) throw ApiError.notFound('Organization not found');
    const memberCount = await membershipRepository.countByOrg(orgId, {
      status: MEMBERSHIP_STATUS.ACTIVE,
    });
    return { org, memberCount };
  }

  async updateOrg(orgId, patch) {
    const update = {};
    if (patch.name !== undefined) update.name = patch.name;
    if (patch.settings) {
      if (patch.settings.timezone !== undefined) update['settings.timezone'] = patch.settings.timezone;
      if (patch.settings.workWeek !== undefined) update['settings.workWeek'] = patch.settings.workWeek;
    }
    const org = await organizationRepository.updateById(orgId, update);
    if (!org) throw ApiError.notFound('Organization not found');
    return org;
  }

  async listMembers(orgId) {
    return membershipRepository.listByOrg(orgId);
  }

  /** Invite a teammate by email; (re)issues a single-use, expiring invite token. */
  async inviteMember(orgId, inviter, { email, role = ORG_ROLES.MEMBER }) {
    const normalized = email.toLowerCase();

    const existingUser = await userRepository.findByEmail(normalized);
    if (existingUser) {
      const m = await membershipRepository.findByUserAndOrg(existingUser.id, orgId);
      if (m && m.status === MEMBERSHIP_STATUS.ACTIVE) {
        throw ApiError.conflict('That person is already a member', { code: 'ALREADY_MEMBER' });
      }
    }

    const { raw, hashed } = createHashedToken();
    const inviteExpiresAt = new Date(Date.now() + config.invite.expiresDays * DAY);

    let membership = await membershipRepository.findPendingByEmail(orgId, normalized);
    if (membership) {
      membership.role = role;
      membership.status = MEMBERSHIP_STATUS.INVITED;
      membership.inviteToken = hashed;
      membership.inviteExpiresAt = inviteExpiresAt;
      membership.invitedById = inviter.id;
      await membership.save();
    } else {
      membership = await membershipRepository.create({
        organizationId: orgId,
        invitedEmail: normalized,
        role,
        status: MEMBERSHIP_STATUS.INVITED,
        inviteToken: hashed,
        inviteExpiresAt,
        invitedById: inviter.id,
      });
    }

    const inviterDoc = await userRepository.findById(inviter.id);
    const org = await organizationRepository.findById(orgId);
    await emailService.sendInviteEmail(normalized, {
      token: raw,
      organizationName: org.name,
      inviterName: inviterDoc?.name,
    });

    return { membership, devToken: config.isProd ? undefined : raw };
  }

  /** Change a member's role. The organization owner's role is immutable here. */
  async updateMemberRole(orgId, membershipId, role) {
    const membership = await membershipRepository.findById(membershipId);
    if (!membership || String(membership.organizationId) !== String(orgId)) {
      throw ApiError.notFound('Member not found');
    }
    if (membership.role === ORG_ROLES.OWNER) {
      throw ApiError.forbidden('The organization owner role cannot be changed here', {
        code: 'OWNER_IMMUTABLE',
      });
    }
    if (role === ORG_ROLES.OWNER) {
      throw ApiError.badRequest('Ownership transfer is not supported', { code: 'NO_OWNER_ASSIGN' });
    }
    membership.role = role;
    await membership.save();
    return membership;
  }

  /** Remove a member (or revoke a pending invite). The owner can't be removed. */
  async removeMember(orgId, membershipId, actingUserId) {
    const membership = await membershipRepository.findById(membershipId);
    if (!membership || String(membership.organizationId) !== String(orgId)) {
      throw ApiError.notFound('Member not found');
    }
    if (membership.role === ORG_ROLES.OWNER) {
      throw ApiError.forbidden('The organization owner cannot be removed', { code: 'OWNER_PROTECTED' });
    }
    if (membership.userId && String(membership.userId) === String(actingUserId)) {
      throw ApiError.badRequest('Use leave organization to remove yourself', { code: 'CANNOT_REMOVE_SELF' });
    }
    await membershipRepository.deleteById(membershipId);
    return { id: membershipId };
  }

  /**
   * Accept an invitation. Creates the user if they don't exist yet (the invite
   * link proves email ownership, so the account is verified), links the
   * membership, and logs the invitee in.
   */
  async acceptInvite({ token, name, password }) {
    const membership = await membershipRepository.findByInviteToken(hashToken(token));
    if (!membership) {
      throw ApiError.badRequest('This invitation is invalid or has expired', { code: 'INVITE_INVALID' });
    }

    const email = membership.invitedEmail;
    let user = await userRepository.findByEmail(email);
    let isNewUser = false;

    if (!user) {
      if (!name || !password) {
        // Signal the client to collect a name + password for the new account.
        throw ApiError.badRequest('Name and password are required to accept', {
          code: 'INVITE_NEEDS_PROFILE',
          details: { email, needsProfile: true },
        });
      }
      user = await userRepository.create({ name, email, password, isEmailVerified: true });
      isNewUser = true;
    }

    // If the user is somehow already a member, just consume the invite.
    const existing = await membershipRepository.findByUserAndOrg(user.id, membership.organizationId);
    if (existing && String(existing.id) !== String(membership.id)) {
      if (existing.status !== MEMBERSHIP_STATUS.ACTIVE) {
        existing.status = MEMBERSHIP_STATUS.ACTIVE;
        await existing.save();
      }
      await membershipRepository.deleteById(membership.id);
    } else {
      membership.userId = user.id;
      membership.status = MEMBERSHIP_STATUS.ACTIVE;
      membership.invitedEmail = null;
      membership.inviteToken = null;
      membership.inviteExpiresAt = null;
      await membership.save();
    }

    if (!user.isEmailVerified) user.isEmailVerified = true;
    user.lastLoginAt = new Date();
    await user.save();

    const tokens = await tokenService.issuePair(user);
    const memberships = await authService.context(user.id);
    return { user, tokens, memberships, isNewUser, organizationId: membership.organizationId };
  }

  /** Public: what email is this invite for (so the accept screen can prefill). */
  async peekInvite(token) {
    const membership = await membershipRepository.findByInviteToken(hashToken(token));
    if (!membership) {
      throw ApiError.badRequest('This invitation is invalid or has expired', { code: 'INVITE_INVALID' });
    }
    const org = await organizationRepository.findById(membership.organizationId);
    const existingUser = await userRepository.findByEmail(membership.invitedEmail);
    return {
      email: membership.invitedEmail,
      organizationName: org?.name,
      needsProfile: !existingUser,
    };
  }
}

export default new OrgService();
