import userRepository from '../repositories/user.repository.js';
import tokenService from './token.service.js';
import emailService from './email.service.js';
import ApiError from '../utils/ApiError.js';
import { MESSAGES } from '../constants/messages.js';
import { ROLES } from '../constants/roles.js';
import { createHashedToken, hashToken } from '../utils/crypto.js';

const FIFTEEN_MIN = 15 * 60 * 1000;
const DAY = 24 * 60 * 60 * 1000;

/**
 * Orchestrates authentication use-cases. Controllers stay thin;
 * all business rules and side effects live here.
 */
class AuthService {
  async register({ name, email, password }) {
    if (await userRepository.exists({ email: email.toLowerCase() })) {
      throw ApiError.conflict(MESSAGES.AUTH.EMAIL_IN_USE, { code: 'EMAIL_IN_USE' });
    }

    const { raw, hashed } = createHashedToken();
    const user = await userRepository.create({
      name,
      email,
      password,
      roles: [ROLES.USER],
      emailVerifyToken: hashed,
      emailVerifyExpires: new Date(Date.now() + DAY),
    });

    await emailService.sendVerificationEmail(user.email, raw);
    return user;
  }

  async login({ email, password }) {
    const user = await userRepository.findByEmail(email, { withSecret: true });
    if (!user || !(await user.comparePassword(password))) {
      throw ApiError.unauthorized(MESSAGES.AUTH.INVALID_CREDENTIALS, { code: 'INVALID_CREDENTIALS' });
    }
    if (!user.isActive) throw ApiError.forbidden('Account is disabled', { code: 'ACCOUNT_DISABLED' });

    user.lastLoginAt = new Date();
    await user.save();

    const tokens = await tokenService.issuePair(user);
    return { user, tokens };
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
    // Do not leak account existence.
    if (!user) return;

    const { raw, hashed } = createHashedToken();
    user.passwordResetToken = hashed;
    user.passwordResetExpires = new Date(Date.now() + FIFTEEN_MIN);
    await user.save();

    await emailService.sendPasswordResetEmail(user.email, raw);
  }

  async resetPassword({ token, password }) {
    const user = await userRepository.findByResetToken(hashToken(token));
    if (!user) throw ApiError.badRequest('Invalid or expired reset token', { code: 'BAD_RESET' });

    user.password = password;
    user.passwordResetToken = undefined;
    user.passwordResetExpires = undefined;
    user.refreshTokenHashes = []; // force re-login everywhere
    await user.save();
  }

  async verifyEmail(token) {
    const user = await userRepository.findByVerifyToken(hashToken(token));
    if (!user) throw ApiError.badRequest('Invalid or expired token', { code: 'BAD_VERIFY' });

    user.isEmailVerified = true;
    user.emailVerifyToken = undefined;
    user.emailVerifyExpires = undefined;
    await user.save();
  }

  async changePassword({ userId, currentPassword, newPassword }) {
    const user = await userRepository.findByIdWithSecret(userId);
    if (!user || !(await user.comparePassword(currentPassword))) {
      throw ApiError.badRequest('Current password is incorrect', { code: 'BAD_CURRENT_PASSWORD' });
    }
    user.password = newPassword;
    user.refreshTokenHashes = [];
    await user.save();
  }
}

export default new AuthService();
