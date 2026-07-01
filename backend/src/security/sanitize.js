import mongoSanitize from 'express-mongo-sanitize';
import xss from 'xss';

/** Strip Mongo operator injection ($, .) from user input. */
export const mongoSanitizer = mongoSanitize({ replaceWith: '_' });

/** Recursively XSS-clean string values in req.body. */
export const xssClean = (req, _res, next) => {
  if (req.body && typeof req.body === 'object') req.body = clean(req.body);
  next();
};

const clean = (value) => {
  if (typeof value === 'string') return xss(value);
  if (Array.isArray(value)) return value.map(clean);
  if (value && typeof value === 'object') {
    return Object.fromEntries(Object.entries(value).map(([k, v]) => [k, clean(v)]));
  }
  return value;
};
