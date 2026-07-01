import config from '../config/index.js';
import { COOKIE_NAMES } from '../constants/tokens.js';

const SEVEN_DAYS = 7 * 24 * 60 * 60 * 1000;

export const setRefreshCookie = (res, token) => {
  res.cookie(COOKIE_NAMES.REFRESH_TOKEN, token, {
    httpOnly: true,
    secure: config.cookie.secure,
    sameSite: 'strict',
    maxAge: SEVEN_DAYS,
    path: '/',
    signed: true,
  });
};

export const clearRefreshCookie = (res) => {
  res.clearCookie(COOKIE_NAMES.REFRESH_TOKEN, { path: '/' });
};

export const readRefreshCookie = (req) =>
  req.signedCookies?.[COOKIE_NAMES.REFRESH_TOKEN] || req.cookies?.[COOKIE_NAMES.REFRESH_TOKEN];
