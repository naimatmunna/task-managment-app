import crypto from 'node:crypto';

/** Generate a URL-safe random token plus its sha256 hash (store the hash, email the raw). */
export const createHashedToken = (bytes = 32) => {
  const raw = crypto.randomBytes(bytes).toString('hex');
  const hashed = crypto.createHash('sha256').update(raw).digest('hex');
  return { raw, hashed };
};

export const hashToken = (raw) => crypto.createHash('sha256').update(raw).digest('hex');
