import { Redis } from 'ioredis';
import { env } from './env';

export const redis = new Redis(env.redisUrl, { maxRetriesPerRequest: null });
export const pubClient = new Redis(env.redisUrl, { maxRetriesPerRequest: null });
export const subClient = pubClient.duplicate();

redis.on('error', (err) => console.error('[redis] connection error:', err.message));
