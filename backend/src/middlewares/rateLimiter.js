import rateLimit from 'express-rate-limit';
import config from '../config/index.js';

const base = {
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  skip: () => config.isTest,
  message: { success: false, message: 'Too many requests, please try again later.' },
};

/** Global limiter for the whole API surface. */
export const apiLimiter = rateLimit({
  windowMs: config.rateLimit.windowMs,
  max: config.rateLimit.max,
  ...base,
});

/** Stricter limiter for auth endpoints to slow brute-force attempts. */
export const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  ...base,
});
