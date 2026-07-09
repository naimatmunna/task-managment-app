import mongoose from 'mongoose';
import createApp from '../src/app.js';
import config from '../src/config/index.js';

/**
 * Vercel serverless entry point.
 *
 * Wraps the Express app as a single function. NOTE: realtime (Socket.io) and
 * background jobs (BullMQ) do NOT run here — a serverless function has no
 * persistent process or WebSocket support. Keep ENABLE_SOCKET / ENABLE_QUEUE
 * off on Vercel; run a long-lived host for those features.
 */
mongoose.set('strictQuery', true);

// Reuse one connection across warm invocations. Without this, each cold
// invocation would open a new pool and quickly exhaust the Atlas connection
// limit under concurrency.
async function ensureDb() {
  if (mongoose.connection.readyState === 1) return;
  if (!globalThis.__dbPromise) {
    globalThis.__dbPromise = mongoose.connect(config.db.uri, {
      maxPoolSize: 5,
      minPoolSize: 0,
      serverSelectionTimeoutMS: 10000,
      socketTimeoutMS: 45000,
    });
  }
  await globalThis.__dbPromise;
}

const app = createApp();

export default async function handler(req, res) {
  try {
    await ensureDb();
  } catch {
    res.statusCode = 503;
    res.setHeader('Content-Type', 'application/json');
    res.end(JSON.stringify({ success: false, message: 'Service temporarily unavailable' }));
    return;
  }
  return app(req, res);
}
