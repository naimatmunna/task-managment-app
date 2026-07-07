import userRepository from '../repositories/user.repository.js';
import organizationRepository from '../repositories/organization.repository.js';
import membershipRepository from '../repositories/membership.repository.js';
import tokenService from './token.service.js';
import otpService from './otp.service.js';
import ApiError from '../utils/ApiError.js';
import config from '../config/index.js';
import { MESSAGES } from '../constants/messages.js';
import { ORG_ROLES, MEMBERSHIP_STATUS } from '../constants/orgRoles.js';
import { OTP_PURPOSE } from '../constants/otp.js';

/**
 * Orchestrates authentication. Signup provisions a tenant (User + Organization +
 * owner Membership) then requires a 6-digit email OTP before issuing tokens.
 * Controllers stay thin; all rules and side effects live here.
 */
class AuthService {
  /** Only surface a raw OTP in responses outside production (dev convenience). */
  devCode(code) {
    return config.isProd ? undefined : code;
  }

  /** Active memberships (org populated) shaped for the client's org switcher. */
  async context(userId) {
    const memberships = await membershipRepository.listOrgsForUser(userId);
    return memberships
      .filter((m) => m.organizationId) // guard against a deleted org
      .map((m) => ({
        id: m.id,
        role: m.role,
        status: m.status,
        organization: {
          id: m.organizationId.id,
          name: m.organizationId.name,
          slug: m.organizationId.slug,
        },
      }));
  }

  /**
   * Provision a new tenant. Creates the user (unverified), their organization,
   * and an owner membership, then emails a signup OTP. No tokens yet.
   */
  async signup({ name, email, password, organizationName }) {
    const normalizedEmail = email.toLowerCase();
    if (await userRepository.exists({ email: normalizedEmail })) {
      throw ApiError.conflict(MESSAGES.AUTH.EMAIL_IN_USE, { code: 'EMAIL_IN_USE' });
    }

    // No cross-collection transaction (single-node Mongo in dev/test): create
    // sequentially and best-effort roll back if a later step fails.
    const user = await userRepository.create({ name, email: normalizedEmail, password });
    let organization;
    try {
      const slug = await organizationRepository.generateUniqueSlug(organizationName);
      organization = await organizationRepository.create({
        name: organizationName,
        slug,
        ownerId: user.id,
      });
      await membershipRepository.create({
        organizationId: organization.id,
        userId: user.id,
        role: ORG_ROLES.OWNER,
        status: MEMBERSHIP_STATUS.ACTIVE,
      });
    } catch (err) {
      if (organization) await organizationRepository.deleteById(organization.id);
      await userRepository.deleteById(user.id);
      throw err;
    }

    const code = await otpService.issue(normalizedEmail, OTP_PURPOSE.SIGNUP);
    return { user, organization, devCode: this.devCode(code) };
  }

  /** Verify the signup OTP, mark the account verified, and issue the first token pair. */
  async verifyOtp({ email, code }) {
    const user = await userRepository.findByEmail(email);
    if (!user) throw ApiError.badRequest('Invalid or expired code', { code: 'OTP_INVALID' });

    await otpService.verify(email, OTP_PURPOSE.SIGNUP, code);

    user.isEmailVerified = true;
    user.lastLoginAt = new Date();
    await user.save();

    const tokens = await tokenService.issuePair(user);
    const memberships = await this.context(user.id);
    return { user, tokens, memberships };
  }

  /** Re-issue an OTP for an unverified signup (or a login/reset flow). */
  async resendOtp({ email, purpose = OTP_PURPOSE.SIGNUP }) {
    const user = await userRepository.findByEmail(email);
    // Never reveal whether the account exists; behave the same either way.
    if (!user) return;
    if (purpose === OTP_PURPOSE.SIGNUP && user.isEmailVerified) return;
    await otpService.issue(email, purpose);
  }

  async login({ email, password }) {
    const user = await userRepository.findByEmail(email, { withSecret: true });
    if (!user || !(await user.comparePassword(password))) {
      throw ApiError.unauthorized(MESSAGES.AUTH.INVALID_CREDENTIALS, { code: 'INVALID_CREDENTIALS' });
    }
    if (!user.isActive) throw ApiError.forbidden('Account is disabled', { code: 'ACCOUNT_DISABLED' });

    // Unverified: re-issue a signup code and tell the client to verify.
    if (!user.isEmailVerified) {
      const code = await otpService.issue(user.email, OTP_PURPOSE.SIGNUP);
      throw ApiError.forbidden(MESSAGES.AUTH.EMAIL_NOT_VERIFIED, {
        code: 'EMAIL_NOT_VERIFIED',
        details: { email: user.email, devCode: this.devCode(code) },
      });
    }

    // Optional second factor (built, default OFF for MVP speed).
    if (config.otp.loginEnabled) {
      const code = await otpService.issue(user.email, OTP_PURPOSE.LOGIN);
      return { otpRequired: true, email: user.email, devCode: this.devCode(code) };
    }

    user.lastLoginAt = new Date();
    await user.save();

    const tokens = await tokenService.issuePair(user);
    const memberships = await this.context(user.id);
    return { user, tokens, memberships };
  }

  /** Complete the optional login second factor. */
  async verifyLoginOtp({ email, code }) {
    const user = await userRepository.findByEmail(email);
    if (!user) throw ApiError.badRequest('Invalid or expired code', { code: 'OTP_INVALID' });

    await otpService.verify(email, OTP_PURPOSE.LOGIN, code);

    user.lastLoginAt = new Date();
    await user.save();

    const tokens = await tokenService.issuePair(user);
    const memberships = await this.context(user.id);
    return { user, tokens, memberships };
  }

  refresh(refreshToken) {
    if (!refreshToken) throw ApiError.unauthorized('Refresh token missing', { code: 'NO_REFRESH' });
    return tokenService.rotate(refreshToken);
  }

  logout(userId, refreshToken) {
    return tokenService.revoke(userId, refreshToken);
  }

  async forgotPassword(email) {
    const user = await userRepository.findByEmail(email);
    if (!user) return; // do not leak account existence
    await otpService.issue(email, OTP_PURPOSE.RESET);
  }

  async resetPassword({ email, code, password }) {
    const user = await userRepository.findByEmail(email, { withSecret: true });
    if (!user) throw ApiError.badRequest('Invalid or expired code', { code: 'OTP_INVALID' });

    await otpService.verify(email, OTP_PURPOSE.RESET, code);

    user.password = password;
    await user.save();
    await userRepository.clearRefreshHashes(user.id); // force re-login everywhere
  }

  async changePassword({ userId, currentPassword, newPassword }) {
    const user = await userRepository.findByIdWithSecret(userId);
    if (!user || !(await user.comparePassword(currentPassword))) {
      throw ApiError.badRequest('Current password is incorrect', { code: 'BAD_CURRENT_PASSWORD' });
    }
    user.password = newPassword;
    await user.save();
    await userRepository.clearRefreshHashes(user.id);
  }

  /** Update the caller's own profile (name / avatar). */
  async updateProfile(userId, { name, avatarUrl }) {
    const user = await userRepository.findById(userId);
    if (!user) throw ApiError.unauthorized();
    if (name !== undefined) user.name = name;
    if (avatarUrl !== undefined) {
      user.avatar = { url: avatarUrl || undefined, publicId: user.avatar?.publicId };
    }
    await user.save();
    return user;
  }

  /** Full principal for /me: the user plus their org memberships. */
  async me(userId) {
    const user = await userRepository.findById(userId);
    if (!user) throw ApiError.unauthorized();
    const memberships = await this.context(userId);
    return { user, memberships };
  }
}

export default new AuthService();
