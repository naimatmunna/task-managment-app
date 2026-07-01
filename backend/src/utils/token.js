import jwt from 'jsonwebtoken';
import config from '../config/index.js';
import { TOKEN_TYPES } from '../constants/tokens.js';

/**
 * Thin, testable wrapper around jsonwebtoken.
 * Access and refresh tokens are signed with distinct secrets so a leaked
 * access secret cannot mint refresh tokens.
 */
export const signAccessToken = (payload) =>
  jwt.sign({ ...payload, type: TOKEN_TYPES.ACCESS }, config.jwt.accessSecret, {
    expiresIn: config.jwt.accessExpiresIn,
  });

export const signRefreshToken = (payload) =>
  jwt.sign({ ...payload, type: TOKEN_TYPES.REFRESH }, config.jwt.refreshSecret, {
    expiresIn: config.jwt.refreshExpiresIn,
  });

export const verifyAccessToken = (token) => jwt.verify(token, config.jwt.accessSecret);
export const verifyRefreshToken = (token) => jwt.verify(token, config.jwt.refreshSecret);
