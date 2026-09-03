import { createRedisConnection } from './src/config/redis';
async function clear() {
  const redis = createRedisConnection();
  const keys = await redis.keys('*rate_limit*');
  if (keys.length > 0) {
    await redis.del(...keys);
    console.log('Cleared rate limits:', keys);
  } else {
    console.log('No rate limits found.');
  }
  process.exit(0);
}
clear();
