import cluster from 'node:cluster';
import os from 'node:os';
import logger from './utils/logger.js';

/**
 * Optional multi-core clustering for CPU-bound scaling.
 * Run with `npm run start:cluster`. In containers, prefer one process per
 * container and scale replicas instead — this is here when you want it.
 */
if (cluster.isPrimary) {
  const workers = Number(process.env.WEB_CONCURRENCY) || os.availableParallelism();
  logger.info(`Primary ${process.pid} forking ${workers} workers`);
  for (let i = 0; i < workers; i += 1) cluster.fork();
  cluster.on('exit', (worker) => {
    logger.warn(`Worker ${worker.process.pid} died; restarting`);
    cluster.fork();
  });
} else {
  import('./server.js');
}
