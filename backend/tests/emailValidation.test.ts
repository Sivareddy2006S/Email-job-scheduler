import { describe, expect, it } from 'vitest';
import { dedupeAndValidateEmails, isValidEmail } from '../src/utils/emailValidation';

describe('emailValidation', () => {
  it('accepts well-formed emails', () => {
    expect(isValidEmail('john@example.com')).toBe(true);
  });

  it('rejects malformed emails', () => {
    expect(isValidEmail('not-an-email')).toBe(false);
    expect(isValidEmail('missing@domain')).toBe(false);
  });

  it('dedupes case-insensitively and separates invalid entries', () => {
    const { valid, invalid } = dedupeAndValidateEmails([
      'John@Example.com',
      'john@example.com',
      'bad-email',
      'rahul@example.com',
    ]);
    expect(valid).toEqual(['John@Example.com', 'rahul@example.com']);
    expect(invalid).toEqual(['bad-email']);
  });
});
