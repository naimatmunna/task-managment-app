import mongoose from 'mongoose';
import { ZodError } from 'zod';
import ApiError from '../utils/ApiError.js';
import { HTTP_STATUS } from '../constants/httpStatus.js';
import logger from '../utils/logger.js';
import config from '../config/index.js';

/**
 * Global error handler. Normalizes every thrown/rejected error into the
 * consistent error envelope. Known error shapes (Zod, Mongoose, JWT) are
 * translated to proper 4xx codes; everything else becomes a safe 500.
 */
export const errorHandler = (err, req, res, _next) => {
  let error = err;

  if (error instanceof ZodError) {
    error = ApiError.unprocessable('Validation failed', {
      code: 'VALIDATION_ERROR',
      details: error.flatten().fieldErrors,
    });
  } else if (error instanceof mongoose.Error.ValidationError) {
    const details = Object.fromEntries(
      Object.entries(error.errors).map(([k, v]) => [k, v.message]),
    );
    error = ApiError.unprocessable('Validation failed', { code: 'DB_VALIDATION', details });
  } else if (error instanceof mongoose.Error.CastError) {
    error = ApiError.badRequest(`Invalid ${error.path}: ${error.value}`, { code: 'CAST_ERROR' });
  } else if (error?.code === 11000) {
    const field = Object.keys(error.keyValue || {})[0] || 'field';
    error = ApiError.conflict(`Duplicate value for "${field}".`, { code: 'DUPLICATE_KEY' });
  } else if (error?.name === 'JsonWebTokenError') {
    error = ApiError.unauthorized('Invalid token', { code: 'INVALID_TOKEN' });
  } else if (error?.name === 'TokenExpiredError') {
    error = ApiError.unauthorized('Token expired', { code: 'TOKEN_EXPIRED' });
  } else if (!(error instanceof ApiError)) {
    error = ApiError.internal(error?.message || 'Internal server error');
  }

  const statusCode = error.statusCode || HTTP_STATUS.INTERNAL_SERVER_ERROR;

  if (statusCode >= 500 || !error.isOperational) {
    logger.error(`${error.message}`, { requestId: req.id, stack: error.stack });
  }

  const body = {
    success: false,
    message: error.message,
    code: error.code ?? null,
    details: error.details ?? null,
    requestId: req.id,
  };

  if (config.isDev && statusCode >= 500) body.stack = error.stack;

  res.status(statusCode).json(body);
};
