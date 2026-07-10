import { io } from 'socket.io-client';
import { config } from '@/config/env.js';
import { getAccessToken } from './token.js';

/**
 * Single shared Socket.io connection. The auth callback is invoked before every
 * (re)connection attempt, so the socket always presents the freshest access
 * token — no manual re-auth needed when the token rotates.
 */
let socket = null;

export const getSocket = () => socket;

/**
 * Open (or reuse) the realtime connection. Returns null when no socket host is
 * configured — realtime requires a persistent server (`VITE_SOCKET_URL`), which
 * cannot be Vercel serverless. Skipping avoids a failing WebSocket retry loop.
 */
export const connectSocket = () => {
  if (!config.socketUrl) return null;
  if (socket) {
    if (!socket.connected) socket.connect();
    return socket;
  }
  socket = io(config.socketUrl, {
    autoConnect: true,
    transports: ['websocket'],
    auth: (cb) => cb({ token: getAccessToken() }),
  });
  return socket;
};

export const disconnectSocket = () => {
  if (socket) {
    socket.removeAllListeners();
    socket.disconnect();
    socket = null;
  }
};
