import { redisClient } from '../config/redis';

export const idempotencyService = {
  /**
   * Ensures at most one Slack notification is sent per sender per hourly
   * rate-limit event. Uses SET ... NX so only the first caller in a given
   * hour window "wins" and actually sends the Slack message.
   */
  async claimRateLimitNotification(senderId: string, windowKey: string): Promise<boolean> {
    const key = `slack-notified:${senderId}:${windowKey}`;
    const result = await redisClient.set(key, '1', 'EX', 3700, 'NX');
    return result === 'OK';
  },
};
