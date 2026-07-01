import config from '../config/index.js';
import logger from '../utils/logger.js';

/**
 * Cache abstraction with graceful fallback:
 * - Redis (ioredis) when REDIS_URL is set.
 * - In-memory Map otherwise, so caching "works" in dev/test with no infra.
 * The public interface (get/set/del) is identical either way.
 */
class MemoryCache {
  constructor() {
    this.store = new Map();
  }
  async get(key) {
    const hit = this.store.get(key);
    if (!hit) return null;
    if (hit.expires && hit.expires < Date.now()) {
      this.store.delete(key);
      return null;
    }
    return hit.value;
  }
  async set(key, value, ttlSeconds) {
    this.store.set(key, {
      value,
      expires: ttlSeconds ? Date.now() + ttlSeconds * 1000 : null,
    });
  }
  async del(key) {
    this.store.delete(key);
  }
}

class RedisCache {
  constructor(client) {
    this.client = client;
  }
  async get(key) {
    const raw = await this.client.get(key);
    return raw ? JSON.parse(raw) : null;
  }
  async set(key, value, ttlSeconds) {
    const payload = JSON.stringify(value);
    if (ttlSeconds) await this.client.set(key, payload, 'EX', ttlSeconds);
    else await this.client.set(key, payload);
  }
  async del(key) {
    await this.client.del(key);
  }
}

let cache = new MemoryCache();
let redisClient = null;

export const initCache = async () => {
  if (!config.redis.enabled) {
    logger.info('Cache: in-memory (Redis not configured)');
    return cache;
  }
  try {
    const { default: Redis } = await import('ioredis');
    redisClient = new Redis(config.redis.url, { lazyConnect: true, maxRetriesPerRequest: 2 });
    await redisClient.connect();
    cache = new RedisCache(redisClient);
    logger.info('Cache: Redis connected');
  } catch (err) {
    logger.warn(`Cache: Redis unavailable (${err.message}); falling back to memory`);
    cache = new MemoryCache();
  }
  return cache;
};

export const getCache = () => cache;
export const getRedisClient = () => redisClient;
