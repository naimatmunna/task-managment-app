import mongoose from 'mongoose';
import catchAsync from '../utils/catchAsync.js';
import ApiResponse from '../utils/ApiResponse.js';
import { MESSAGES } from '../constants/messages.js';

const STATES = ['disconnected', 'connected', 'connecting', 'disconnecting'];

export const healthCheck = catchAsync(async (_req, res) => {
  const db = STATES[mongoose.connection.readyState] || 'unknown';
  return ApiResponse.send(res, {
    message: MESSAGES.COMMON.HEALTHY,
    data: {
      status: 'ok',
      uptime: process.uptime(),
      timestamp: new Date().toISOString(),
      db,
      memory: process.memoryUsage().rss,
    },
  });
});
