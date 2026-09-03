import { redisClient } from '../config/redis';

/**
 * Enforces a minimum spacing between sends for a given sender, safe across
 * multiple concurrent workers. Uses a single atomic Lua script so the
 * "read last send time, compare, write new send time" sequence cannot race.
 *
 * Key: send-spacing:{senderId} -> last accepted send timestamp (ms)
 */
const CHECK_AND_RESERVE_SCRIPT = `
local key = KEYS[1]
local now = tonumber(ARGV[1])
local minDelay = tonumber(ARGV[2])
local last = tonumber(redis.call('GET', key) or '0')
local nextAllowed = last + minDelay
if now >= nextAllowed then
  redis.call('SET', key, now, 'PX', minDelay + 60000)
  return 0
else
  redis.call('SET', key, nextAllowed, 'PX', (nextAllowed - now) + minDelay + 60000)
  return nextAllowed - now
end
`;

export const minDelayService = {
  /**
   * Returns 0 if the caller may send immediately (and reserves the slot),
   * or the number of milliseconds the caller must wait before retrying.
   */
  async checkAndReserve(senderId: string, minDelayMs: number): Promise<number> {
    if (minDelayMs <= 0) return 0;
    const key = `send-spacing:${senderId}`;
    const waitMs = (await redisClient.eval(
      CHECK_AND_RESERVE_SCRIPT,
      1,
      key,
      String(Date.now()),
      String(minDelayMs)
    )) as number;
    return waitMs;
  },
};
