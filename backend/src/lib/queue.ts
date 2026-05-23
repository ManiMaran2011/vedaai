import Redis from 'ioredis';
import { Queue } from 'bullmq';
import { config } from '../config/index.js';

// Shared Redis client
export const redis = new Redis(config.redisUrl, {
  maxRetriesPerRequest: null,
  lazyConnect: true,
  retryStrategy: (times) => Math.min(times * 200, 5000),
});

redis.on('error', (err) => {
  if (config.isDev) console.warn('[Redis]', err.message);
});

redis.on('connect', () => console.log('  → Redis connected'));

// BullMQ queue
export const generationQueue = new Queue('generation', {
  connection: { url: config.redisUrl },
  defaultJobOptions: {
    attempts: 3,
    backoff: { type: 'exponential', delay: 3000 },
    removeOnComplete: { count: 100 },
    removeOnFail: { count: 50 },
  },
});

// Cache helpers
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
