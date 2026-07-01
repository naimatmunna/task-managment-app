import ApiError from '../utils/ApiError.js';
import { verifyAccessToken } from '../utils/token.js';
import { TOKEN_TYPES } from '../constants/tokens.js';
import { MESSAGES } from '../constants/messages.js';
import userRepository from '../repositories/user.repository.js';

/**
 * Verify the Bearer access token, load the user, and attach a lean principal
 * (id, email, roles) to req.user. Rejects disabled/deleted accounts.
 */
export const authenticate = async (req, _res, next) => {
  try {
    const header = req.headers.authorization || '';
    const token = header.startsWith('Bearer ') ? header.slice(7) : null;
    if (!token) throw ApiError.unauthorized(MESSAGES.AUTH.UNAUTHORIZED);

    const payload = verifyAccessToken(token);
    if (payload.type !== TOKEN_TYPES.ACCESS) throw ApiError.unauthorized('Invalid token type');

    const user = await userRepository.findById(payload.sub);
    if (!user || !user.isActive) throw ApiError.unauthorized('Account is inactive or removed');

    req.user = { id: user.id, email: user.email, roles: user.roles };
    next();
  } catch (err) {
    next(err);
  }
};
