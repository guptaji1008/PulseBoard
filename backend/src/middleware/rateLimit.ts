import rateLimit from 'express-rate-limit';
import { RedisStore } from 'rate-limit-redis';
import { redis } from '../config/redis';
import { env } from '../config/env';

const makeStore = (prefix: string) =>
  new RedisStore({
    prefix,
    // Glue between express-rate-limit and ioredis; types differ slightly across versions.
    sendCommand: (...args: string[]): Promise<any> => (redis as any).call(...args),
  });

export const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 300,
  standardHeaders: true,
  legacyHeaders: false,
  skip: () => env.nodeEnv === 'test',
  store: makeStore('rl:api:'),
});

export const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many authentication attempts, please try again later.' },
  skip: () => env.nodeEnv === 'test',
  store: makeStore('rl:auth:'),
});

export const aiLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'AI summary rate limit reached, please wait a moment.' },
  skip: () => env.nodeEnv === 'test',
  store: makeStore('rl:ai:'),
});
