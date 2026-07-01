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

    const doc = await userRepository.findByIdWithSecret(user.id);
    doc.refreshTokenHashes.push(hashToken(refreshToken));
    if (doc.refreshTokenHashes.length > MAX_SESSIONS) {
      doc.refreshTokenHashes = doc.refreshTokenHashes.slice(-MAX_SESSIONS);
    }
    await doc.save();

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

    const presentedHash = hashToken(refreshToken);
    const index = user.refreshTokenHashes.indexOf(presentedHash);

    // Token not in the valid set => reuse/compromise: revoke all sessions.
    if (index === -1) {
      user.refreshTokenHashes = [];
      await user.save();
      throw ApiError.unauthorized('Refresh token reuse detected', { code: 'REFRESH_REUSE' });
    }

    // Consume the old hash, mint and store a new pair.
    user.refreshTokenHashes.splice(index, 1);
    const newPair = {
      accessToken: signAccessToken(this.buildPayload(user)),
      refreshToken: signRefreshToken(this.buildPayload(user)),
    };
    user.refreshTokenHashes.push(hashToken(newPair.refreshToken));
    await user.save();

    return newPair;
  }

  async revoke(userId, refreshToken) {
    const user = await userRepository.findByIdWithSecret(userId);
    if (!user) return;
    if (refreshToken) {
      const h = hashToken(refreshToken);
      user.refreshTokenHashes = user.refreshTokenHashes.filter((x) => x !== h);
    } else {
      user.refreshTokenHashes = [];
    }
    await user.save();
  }
}

export default new TokenService();
