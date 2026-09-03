import { describe, expect, it, vi, beforeEach } from 'vitest';

const evalMock = vi.fn();
const decrMock = vi.fn();

vi.mock('../src/config/redis', () => ({
  redisClient: { eval: (...args: unknown[]) => evalMock(...args), decr: (...args: unknown[]) => decrMock(...args) },
}));

import { rateLimitService } from '../src/services/rateLimitService';

describe('rateLimitService', () => {
  beforeEach(() => {
    evalMock.mockReset();
    decrMock.mockReset();
  });

  it('allows sending when under the hourly limit', async () => {
    evalMock.mockResolvedValue(5);
    const result = await rateLimitService.tryReserveSlot('sender-1', 100);
    expect(result.allowed).toBe(true);
    expect(result.currentCount).toBe(5);
  });

  it('rejects and rolls back the counter when the limit is exceeded', async () => {
    evalMock.mockResolvedValue(101);
    const result = await rateLimitService.tryReserveSlot('sender-1', 100);
    expect(result.allowed).toBe(false);
    expect(decrMock).toHaveBeenCalled();
  });
});
