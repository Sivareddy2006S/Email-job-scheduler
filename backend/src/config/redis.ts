import IORedis, { Redis } from 'ioredis';
import { env } from './env';
import { logger } from '../utils/logger';

// BullMQ requires maxRetriesPerRequest: null on connections used by Queue/Worker.
export function createRedisConnection(): Redis {
  const connection = new IORedis(env.redisUrl, {
    maxRetriesPerRequest: null,
    enableReadyCheck: true,
  });

  connection.on('connect', () => logger.info('Redis connected'));
  connection.on('error', (err) => logger.error({ err }, 'Redis connection error'));

  return connection;
}

// A shared general-purpose connection for rate limiting / idempotency locks,
// separate from the BullMQ queue/worker connections.
export const redisClient = createRedisConnection();
