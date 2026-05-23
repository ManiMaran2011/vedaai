import Redis from 'ioredis';
import { Queue } from 'bullmq';
import { config } from '../config/index.js';

export const redis = new Redis(config.redisUrl, {
  maxRetriesPerRequest: 3,
  retryStrategy: (times) => {
    if (times > 3) return null; // stop retrying
    return Math.min(times * 500, 2000);
  },
  enableOfflineQueue: false,
  lazyConnect: true,
  tls: config.redisUrl.startsWith('rediss://') ? {} : undefined,
});

redis.on('error', () => {}); // suppress error spam
redis.on('connect', () => console.log('  → Redis connected'));

export const generationQueue = new Queue('generation', {
  connection: { url: config.redisUrl },
  defaultJobOptions: {
    attempts: 3,
    backoff: { type: 'exponential', delay: 3000 },
    removeOnComplete: { count: 100 },
    removeOnFail: { count: 50 },
  },
});

export const cache = {
  async get<T>(key: string): Promise<T | null> {
    try {
      const val = await redis.get(key);
      return val ? (JSON.parse(val) as T) : null;
    } catch { return null; }
  },
  async set(key: string, value: unknown, ttl = 300): Promise<void> {
    try { await redis.setex(key, ttl, JSON.stringify(value)); } catch { /* ignore */ }
  },
  async del(key: string): Promise<void> {
    try { await redis.del(key); } catch { /* ignore */ }
  },
};
