import config from '../config/index.js';
import logger from '../utils/logger.js';
import { verifyAccessToken } from '../utils/token.js';

/**
 * Optional Socket.io layer. Only initialized when ENABLE_SOCKET=true.
 * Authenticates connections with the same access token as the REST API.
 */
let io = null;

export const initSocket = async (httpServer) => {
  if (!config.socket.enabled) {
    logger.info('Socket.io: disabled');
    return null;
  }
  try {
    const { Server } = await import('socket.io');
    io = new Server(httpServer, {
      cors: { origin: config.cors.origins, credentials: true },
    });

    io.use((socket, next) => {
      try {
        const token = socket.handshake.auth?.token;
        const payload = verifyAccessToken(token);
        socket.user = { id: payload.sub, roles: payload.roles };
        next();
      } catch {
        next(new Error('Unauthorized socket connection'));
      }
    });

    io.on('connection', (socket) => {
      logger.debug(`Socket connected: ${socket.id} (user ${socket.user.id})`);
      socket.join(`user:${socket.user.id}`);
    });

    logger.info('Socket.io: enabled');
  } catch (err) {
    logger.warn(`Socket.io init failed: ${err.message}`);
  }
  return io;
};

export const getIo = () => io;
