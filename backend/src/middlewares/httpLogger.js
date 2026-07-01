import morgan from 'morgan';
import logger from '../utils/logger.js';
import config from '../config/index.js';

morgan.token('id', (req) => req.id);

const stream = { write: (msg) => logger.http(msg.trim()) };

const format = config.isProd
  ? ':id :remote-addr :method :url :status :res[content-length] - :response-time ms'
  : ':id :method :url :status :response-time ms';

export const httpLogger = morgan(format, { stream, skip: () => config.isTest });
