import mongoose from 'mongoose';
import config from '../config/index.js';
import logger from '../utils/logger.js';

mongoose.set('strictQuery', true);

/**
 * Connect to MongoDB with sensible pool settings and lifecycle logging.
 * Returns the active connection so callers can await readiness at boot.
 */
export const connectDatabase = async () => {
  const conn = await mongoose.connect(config.db.uri, {
    maxPoolSize: 20,
    minPoolSize: 2,
    serverSelectionTimeoutMS: 10000,
    socketTimeoutMS: 45000,
  });

  logger.info(`MongoDB connected: ${conn.connection.host}/${conn.connection.name}`);

  mongoose.connection.on('error', (err) => logger.error(`MongoDB error: ${err.message}`));
  mongoose.connection.on('disconnected', () => logger.warn('MongoDB disconnected'));

  return conn.connection;
};

export const disconnectDatabase = async () => {
  await mongoose.connection.close(false);
  logger.info('MongoDB connection closed');
};
