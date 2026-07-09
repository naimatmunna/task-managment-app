import mongoose from 'mongoose';
import config from '../config/index.js';
import logger from '../utils/logger.js';
import { resolveMongoUri } from '../utils/mongoUri.js';

mongoose.set('strictQuery', true);

const connectOptions = {
  maxPoolSize: 20,
  minPoolSize: 2,
  serverSelectionTimeoutMS: 15000,
  socketTimeoutMS: 45000,
  /** Prefer IPv4 — avoids some Windows DNS/SRV issues with IPv6. */
  family: 4,
};

/**
 * Pick the best URI: optional direct override, else resolve Atlas SRV to standard hosts.
 */
const buildConnectionUri = async () => {
  if (config.db.uriDirect) {
    logger.info('Using MONGO_URI_DIRECT (non-SRV connection string)');
    return config.db.uriDirect;
  }

  if (!config.db.uri.startsWith('mongodb+srv://')) {
    return config.db.uri;
  }

  try {
    const resolved = await resolveMongoUri(config.db.uri);
    logger.info('MongoDB Atlas SRV resolved to standard connection hosts');
    return resolved;
  } catch (err) {
    logger.error(`MongoDB SRV resolve failed: ${err.message}`);
    throw err;
  }
};

/**
 * Connect to MongoDB with sensible pool settings and lifecycle logging.
 * Returns the active connection so callers can await readiness at boot.
 */
export const connectDatabase = async () => {
  const uri = await buildConnectionUri();
  const conn = await mongoose.connect(uri, connectOptions);

  logger.info(`MongoDB connected: ${conn.connection.host}/${conn.connection.name}`);

  mongoose.connection.on('error', (err) => logger.error(`MongoDB error: ${err.message}`));
  mongoose.connection.on('disconnected', () => logger.warn('MongoDB disconnected'));

  return conn.connection;
};

export const disconnectDatabase = async () => {
  await mongoose.connection.close(false);
  logger.info('MongoDB connection closed');
};
