import { Redis } from 'ioredis';
import { env } from './env';

function createRedisClient(label: string) {
  const client = new Redis(env.redisUrl, { maxRetriesPerRequest: null });

  client.on('error', (err) => {
    console.error(`[redis:${label}] connection error:`, err.message || err.name);
  });

  return client;
}

export const redis = createRedisClient('default');
export const pubClient = createRedisClient('pub');
export const subClient = pubClient.duplicate();

subClient.on('error', (err) => {
  console.error('[redis:sub] connection error:', err.message || err.name);
});
