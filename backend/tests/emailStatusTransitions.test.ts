import { describe, expect, it } from 'vitest';

// Documents the valid state machine for email status transitions used by
// the worker (see src/workers/emailWorker.ts). This is a lightweight
// specification test rather than a DB-integration test.
type Status = 'scheduled' | 'processing' | 'sent' | 'failed';

const validTransitions: Record<Status, Status[]> = {
  scheduled: ['processing'],
  processing: ['sent', 'failed', 'scheduled'], // scheduled = deferred (rate limit/min delay) or retry
  sent: [],
  failed: [],
};

function isValidTransition(from: Status, to: Status): boolean {
  return validTransitions[from].includes(to);
}

describe('email status state machine', () => {
  it('allows scheduled -> processing', () => {
    expect(isValidTransition('scheduled', 'processing')).toBe(true);
  });

  it('allows processing -> sent', () => {
    expect(isValidTransition('processing', 'sent')).toBe(true);
  });

  it('disallows sent -> processing (no re-sending)', () => {
    expect(isValidTransition('sent', 'processing')).toBe(false);
  });

  it('disallows scheduled -> sent directly (must pass through processing)', () => {
    expect(isValidTransition('scheduled', 'sent')).toBe(false);
  });
});
