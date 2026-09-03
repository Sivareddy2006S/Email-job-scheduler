const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function isValidEmail(email: string): boolean {
  return EMAIL_REGEX.test(email.trim());
}

export function dedupeAndValidateEmails(emails: string[]): { valid: string[]; invalid: string[] } {
  const seen = new Set<string>();
  const valid: string[] = [];
  const invalid: string[] = [];

  for (const raw of emails) {
    const trimmed = raw.trim();
    if (!trimmed) continue;
    if (!isValidEmail(trimmed)) {
      invalid.push(trimmed);
      continue;
    }
    const normalized = trimmed.toLowerCase();
    if (seen.has(normalized)) continue;
    seen.add(normalized);
    valid.push(trimmed);
  }

  return { valid, invalid };
}
