import { redisClient } from '../config/redis';
import { env } from '../config/env';
import type { RateLimitCheckResult } from '../types';

/**
 * Distributed, Redis-backed hourly rate limiter.
 *
 * Key shape: email-rate:{senderId}:{hourWindow}
 * where hourWindow = Math.floor(Date.now() / 3600000) — an integer that
 * uniquely identifies the current clock hour. INCR is atomic in Redis, so
 * concurrent workers/instances all see a consistent, monotonically
 * increasing counter for the same window. The key is given a TTL slightly
 * longer than an hour so stale windows are cleaned up automatically.
 */
const HOUR_MS = 60 * 60 * 1000;

function hourWindowKey(senderId: string, windowIndex: number): string {
  return `email-rate:${senderId}:${windowIndex}`;
}

export function currentHourWindow(date: Date = new Date()): number {
  return Math.floor(date.getTime() / HOUR_MS);
}

// Atomically increments the counter and returns the new value in one round trip.
const INCR_WITH_TTL_SCRIPT = `
local current = redis.call('INCR', KEYS[1])
if tonumber(current) == 1 then
  redis.call('PEXPIRE', KEYS[1], ARGV[1])
end
return current
`;

export const rateLimitService = {
  /**
   * Attempts to reserve one send slot for the given sender in the current
   * hour window. If the limit is already reached, the increment is rolled
   * back (via DECR) so the count reflects only accepted sends.
   */
  async tryReserveSlot(senderId: string, hourlyLimit: number): Promise<RateLimitCheckResult> {
    const limit = hourlyLimit > 0 ? hourlyLimit : env.maxEmailsPerHour;
    const windowIndex = currentHourWindow();
    const key = hourWindowKey(senderId, windowIndex);

    const count = (await redisClient.eval(
      INCR_WITH_TTL_SCRIPT,
      1,
      key,
      String(HOUR_MS + 60_000)
    )) as number;

    if (count > limit) {
      await redisClient.decr(key);
      const msRemainingInWindow = (windowIndex + 1) * HOUR_MS - Date.now();
      return {
        allowed: false,
        currentCount: limit,
        limit,
        windowKey: key,
        retryAfterMs: Math.max(msRemainingInWindow, 0),
      };
    }

    return { allowed: true, currentCount: count, limit, windowKey: key };
  },

  /** Time (ms) until the next hour window begins, for rescheduling. */
  msUntilNextWindow(): number {
    const windowIndex = currentHourWindow();
    return (windowIndex + 1) * HOUR_MS - Date.now();
  },
};
