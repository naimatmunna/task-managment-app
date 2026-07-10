import config from '../config/index.js';
import logger from '../utils/logger.js';
import { verifyAccessToken } from '../utils/token.js';
import membershipRepository from '../repositories/membership.repository.js';

/**
 * Optional Socket.io layer (ENABLE_SOCKET=true). Connections authenticate with
 * the same access token as the REST API, then join a room per organization the
 * user belongs to. Two things are broadcast to those rooms:
 *   • task:created / task:updated / task:deleted — live board updates
 *   • presence:update — the set of currently-online member ids
 *
 * NOTE: requires a long-lived server process — this does not run on serverless
 * platforms (e.g. Vercel functions), which have no persistent WebSocket.
 */
let io = null;

// orgId -> Map<userId, Set<socketId>>. A user may have several sockets (tabs);
// they count as online in an org until their last socket disconnects.
const presence = new Map();

const onlineUserIds = (orgId) => Array.from(presence.get(orgId)?.keys() ?? []);

/** Register a socket; returns true if the user just became online in this org. */
const addPresence = (orgId, userId, socketId) => {
  if (!presence.has(orgId)) presence.set(orgId, new Map());
  const users = presence.get(orgId);
  if (!users.has(userId)) users.set(userId, new Set());
  const set = users.get(userId);
  set.add(socketId);
  return set.size === 1;
};

/** Deregister a socket; returns true if the user just went fully offline. */
const removePresence = (orgId, userId, socketId) => {
  const users = presence.get(orgId);
  const set = users?.get(userId);
  if (!set) return false;
  set.delete(socketId);
  if (set.size === 0) {
    users.delete(userId);
    if (users.size === 0) presence.delete(orgId);
    return true;
  }
  return false;
};

const broadcastPresence = (orgId) => {
  io?.to(`org:${orgId}`).emit('presence:update', { orgId, online: onlineUserIds(orgId) });
};

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
        const payload = verifyAccessToken(socket.handshake.auth?.token);
        socket.user = { id: payload.sub, roles: payload.roles };
        next();
      } catch {
        next(new Error('Unauthorized socket connection'));
      }
    });

    io.on('connection', async (socket) => {
      const userId = socket.user.id;
      socket.join(`user:${userId}`);
      logger.debug(`Socket connected: ${socket.id} (user ${userId})`);

      let orgIds = [];
      try {
        const memberships = await membershipRepository.findActiveByUser(userId);
        orgIds = memberships.map((m) => String(m.organizationId));
      } catch (err) {
        logger.warn(`Socket presence lookup failed: ${err.message}`);
      }

      orgIds.forEach((orgId) => {
        socket.join(`org:${orgId}`);
        const newlyOnline = addPresence(orgId, userId, socket.id);
        // Always hand the joining socket the current roster…
        socket.emit('presence:update', { orgId, online: onlineUserIds(orgId) });
        // …and notify the rest of the org only when this user just came online.
        if (newlyOnline) broadcastPresence(orgId);
      });

      socket.on('disconnect', () => {
        orgIds.forEach((orgId) => {
          if (removePresence(orgId, userId, socket.id)) broadcastPresence(orgId);
        });
      });
    });

    logger.info('Socket.io: enabled');
  } catch (err) {
    logger.warn(`Socket.io init failed: ${err.message}`);
  }
  return io;
};

export const getIo = () => io;

/** Broadcast an event to everyone in an organization (no-op if sockets are off). */
export const emitToOrg = (orgId, event, payload) => {
  io?.to(`org:${String(orgId)}`).emit(event, payload);
};
