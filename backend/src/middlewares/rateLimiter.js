import rateLimit from 'express-rate-limit';
import config from '../config/index.js';

const base = {
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  skip: () => config.isTest,
  message: { success: false, message: 'Too many requests, please try again later.' },
};

/**
 * Global limiter for the whole API surface. Task routes are exempted so heavy
 * board interaction (drag-to-reorder, rapid inline edits) is never throttled.
 */
export const apiLimiter = rateLimit({
  windowMs: config.rateLimit.windowMs,
  max: config.rateLimit.max,
  ...base,
  skip: (req) => config.isTest || req.path.includes('/tasks'),
});

/**
 * Stricter limiter for auth endpoints to slow brute-force / OTP-guessing.
 * ~1 minute window; a handful of tries per IP is enough for a legit multi-step
 * signup→verify flow while throttling automated attacks.
 */
export const authLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 10,
  ...base,
});
