import env from './env.js';

/**
 * Aggregated, namespaced configuration object.
 * Consumers import from here rather than reaching into process.env,
 * keeping env access centralized and mockable in tests.
 */
const config = Object.freeze({
  env: env.NODE_ENV,
  isProd: env.isProd,
  isDev: env.isDev,
  isTest: env.isTest,
  port: env.PORT,
  apiPrefix: env.API_PREFIX,
  clientUrl: env.CLIENT_URL,
  appName: env.APP_NAME,

  db: { uri: env.MONGO_URI },

  otp: {
    length: env.OTP_LENGTH,
    expiresMin: env.OTP_EXPIRES_MIN,
    maxAttempts: env.OTP_MAX_ATTEMPTS,
    loginEnabled: env.LOGIN_OTP_ENABLED,
  },

  invite: { expiresDays: env.INVITE_EXPIRES_DAYS },

  jwt: {
    accessSecret: env.JWT_ACCESS_SECRET,
    refreshSecret: env.JWT_REFRESH_SECRET,
    accessExpiresIn: env.JWT_ACCESS_EXPIRES_IN,
    refreshExpiresIn: env.JWT_REFRESH_EXPIRES_IN,
  },

  cookie: { secret: env.COOKIE_SECRET, secure: env.COOKIE_SECURE },

  cors: { origins: env.corsOrigins },

  mail: {
    host: env.MAIL_HOST,
    port: env.MAIL_PORT,
    user: env.MAIL_USER,
    pass: env.MAIL_PASS,
    from: env.MAIL_FROM,
  },

  redis: { url: env.REDIS_URL, enabled: Boolean(env.REDIS_URL) },
  cloudinary: { url: env.CLOUDINARY_URL, enabled: Boolean(env.CLOUDINARY_URL) },
  socket: { enabled: env.ENABLE_SOCKET },
  queue: { enabled: env.ENABLE_QUEUE && Boolean(env.REDIS_URL) },

  log: { level: env.LOG_LEVEL },

  rateLimit: { windowMs: env.RATE_LIMIT_WINDOW_MS, max: env.RATE_LIMIT_MAX },
});

export default config;
