import { HTTP_STATUS } from '../constants/httpStatus.js';

/**
 * Operational error the app throws deliberately (bad input, not found, etc.).
 * The global error handler distinguishes these from unexpected programmer errors.
 */
export default class ApiError extends Error {
  constructor(statusCode, message, { isOperational = true, details = null, code } = {}) {
    super(message);
    this.statusCode = statusCode;
    this.isOperational = isOperational;
    this.details = details;
    this.code = code;
    Error.captureStackTrace(this, this.constructor);
  }

  static badRequest(msg = 'Bad request', opts) {
    return new ApiError(HTTP_STATUS.BAD_REQUEST, msg, opts);
  }
  static unauthorized(msg = 'Unauthorized', opts) {
    return new ApiError(HTTP_STATUS.UNAUTHORIZED, msg, opts);
  }
  static forbidden(msg = 'Forbidden', opts) {
    return new ApiError(HTTP_STATUS.FORBIDDEN, msg, opts);
  }
  static notFound(msg = 'Not found', opts) {
    return new ApiError(HTTP_STATUS.NOT_FOUND, msg, opts);
  }
  static conflict(msg = 'Conflict', opts) {
    return new ApiError(HTTP_STATUS.CONFLICT, msg, opts);
  }
  static unprocessable(msg = 'Unprocessable entity', opts) {
    return new ApiError(HTTP_STATUS.UNPROCESSABLE_ENTITY, msg, opts);
  }
  static internal(msg = 'Internal server error', opts) {
    return new ApiError(HTTP_STATUS.INTERNAL_SERVER_ERROR, msg, { isOperational: false, ...opts });
  }
}
