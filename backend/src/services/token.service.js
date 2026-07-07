import { signAccessToken, signRefreshToken, verifyRefreshToken } from '../utils/token.js';
import { hashToken } from '../utils/crypto.js';
import userRepository from '../repositories/user.repository.js';
import ApiError from '../utils/ApiError.js';
import { TOKEN_TYPES } from '../constants/tokens.js';

const MAX_SESSIONS = 5; // cap concurrent refresh tokens per user

/**
 * Issues access/refresh pairs and implements refresh-token rotation:
 * each refresh consumes the presented token's hash and stores a new one.
 * Reuse of a rotated token is treated as compromise and clears sessions.
 */
class TokenService {
  buildPayload(user) {
    return { sub: user.id, email: user.email, roles: user.roles };
  }

  async issuePair(user) {
    const payload = this.buildPayload(user);
    const accessToken = signAccessToken(payload);
    const refreshToken = signRefreshToken(payload);

    // Atomic append + cap; safe under concurrent logins for the same user.
    await userRepository.pushRefreshHash(user.id, hashToken(refreshToken), MAX_SESSIONS);

    return { accessToken, refreshToken };
  }

  async rotate(refreshToken) {
    let payload;
    try {
      payload = verifyRefreshToken(refreshToken);
    } catch {
      throw ApiError.unauthorized('Invalid refresh token', { code: 'INVALID_REFRESH' });
    }
    if (payload.type !== TOKEN_TYPES.REFRESH) {
      throw ApiError.unauthorized('Invalid token type', { code: 'INVALID_REFRESH' });
    }

    const user = await userRepository.findByIdWithSecret(payload.sub);
    if (!user || !user.isActive) throw ApiError.unauthorized('Account unavailable');

    // Atomically consume the presented hash. Exactly one concurrent request can
    // succeed; a second attempt with the same (already-rotated) token removes
    // nothing => treated as reuse/compromise and all sessions are revoked.
    const presentedHash = hashToken(refreshToken);
    const consumed = await userRepository.pullRefreshHash(user.id, presentedHash);
    if (!consumed) {
      await userRepository.clearRefreshHashes(user.id);
      throw ApiError.unauthorized('Refresh token reuse detected', { code: 'REFRESH_REUSE' });
    }

    // Mint and atomically store the new pair.
    const newPair = {
      accessToken: signAccessToken(this.buildPayload(user)),
      refreshToken: signRefreshToken(this.buildPayload(user)),
    };
    await userRepository.pushRefreshHash(user.id, hashToken(newPair.refreshToken), MAX_SESSIONS);

    return newPair;
  }

  async revoke(userId, refreshToken) {
    if (refreshToken) {
      await userRepository.pullRefreshHash(userId, hashToken(refreshToken));
    } else {
      await userRepository.clearRefreshHashes(userId);
    }
  }
}

export default new TokenService();
