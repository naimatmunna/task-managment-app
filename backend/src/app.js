import express from 'express';
import helmet from 'helmet';
import cors from 'cors';
import compression from 'compression';
import cookieParser from 'cookie-parser';
import hpp from 'hpp';

import config from './config/index.js';
import routes from './routes/index.js';
import { mountSwagger } from './loaders/swagger.js';
import { requestId } from './middlewares/requestId.js';
import { httpLogger } from './middlewares/httpLogger.js';
import { apiLimiter } from './middlewares/rateLimiter.js';
import { mongoSanitizer, xssClean } from './security/sanitize.js';
import { notFound } from './middlewares/notFound.js';
import { errorHandler } from './middlewares/errorHandler.js';
import ApiError from './utils/ApiError.js';

/**
 * Assembles the Express application. Kept free of side effects (no listen,
 * no DB connect) so it can be imported directly by Supertest.
 */
export const createApp = () => {
  const app = express();

  app.set('trust proxy', 1);

  // Security & parsing
  app.use(helmet());
  app.use(
    cors({
      origin(origin, cb) {
        if (!origin || config.cors.origins.includes(origin)) return cb(null, true);
        return cb(ApiError.forbidden(`CORS blocked for origin: ${origin}`));
      },
      credentials: true,
    }),
  );
  app.use(express.json({ limit: '1mb' }));
  app.use(express.urlencoded({ extended: true, limit: '1mb' }));
  app.use(cookieParser(config.cookie.secret));
  app.use(compression());
  app.use(hpp());
  app.use(mongoSanitizer);
  app.use(xssClean);

  // Observability
  app.use(requestId);
  app.use(httpLogger);

  // Docs (public)
  mountSwagger(app);

  // Rate limiting + versioned API
  app.use(config.apiPrefix, apiLimiter, routes);

  // Fallthrough
  app.use(notFound);
  app.use(errorHandler);

  return app;
};

export default createApp;
