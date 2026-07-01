import { HTTP_STATUS } from '../constants/httpStatus.js';

/**
 * Consistent success envelope for every endpoint:
 * { success, message, data, meta }
 */
export default class ApiResponse {
  static send(res, { statusCode = HTTP_STATUS.OK, message = 'Success', data = null, meta } = {}) {
    const body = { success: true, message, data };
    if (meta) body.meta = meta;
    return res.status(statusCode).json(body);
  }

  static created(res, opts = {}) {
    return ApiResponse.send(res, { statusCode: HTTP_STATUS.CREATED, ...opts });
  }

  static noContent(res) {
    return res.status(HTTP_STATUS.NO_CONTENT).send();
  }
}
