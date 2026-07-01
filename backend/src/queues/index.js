import config from '../config/index.js';
import logger from '../utils/logger.js';

/**
 * Background-job abstraction. Uses BullMQ when a queue is enabled AND Redis
 * is configured; otherwise runs the job inline (awaited) so features work
 * without a worker/broker in local/test.
 */
const handlers = new Map();
let queue = null;
let worker = null;

export const registerJob = (name, handler) => {
  handlers.set(name, handler);
};

export const initQueue = async () => {
  if (!config.queue.enabled) {
    logger.info('Queue: inline mode (BullMQ/Redis not enabled)');
    return;
  }
  try {
    const { Queue, Worker } = await import('bullmq');
    const connection = { url: config.redis.url };
    queue = new Queue('app-jobs', { connection });
    worker = new Worker(
      'app-jobs',
      async (job) => {
        const handler = handlers.get(job.name);
        if (!handler) throw new Error(`No handler for job "${job.name}"`);
        return handler(job.data);
      },
      { connection },
    );
    worker.on('failed', (job, err) => logger.error(`Job ${job?.name} failed: ${err.message}`));
    logger.info('Queue: BullMQ worker started');
  } catch (err) {
    logger.warn(`Queue: BullMQ unavailable (${err.message}); using inline mode`);
    queue = null;
  }
};

export const dispatch = async (name, data = {}) => {
  if (queue) return queue.add(name, data, { removeOnComplete: true, attempts: 3 });
  const handler = handlers.get(name);
  if (!handler) throw new Error(`No handler for job "${name}"`);
  return handler(data);
};

export const closeQueue = async () => {
  await worker?.close();
  await queue?.close();
};
