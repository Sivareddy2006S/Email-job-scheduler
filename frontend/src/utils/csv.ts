import Papa from 'papaparse';

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export interface ParsedRecipients {
  valid: string[];
  invalid: string[];
}

function extractCandidates(text: string): string[] {
  // Handles both plain newline-separated lists and CSV files where emails
  // might live in any column.
  return text
    .split(/\r?\n|,/)
    .map((s) => s.trim())
    .filter(Boolean);
}

export function parseRecipientsFile(file: File): Promise<ParsedRecipients> {
  return new Promise((resolve, reject) => {
    Papa.parse(file, {
      complete: (results) => {
        const flat = (results.data as string[][]).flat().map((s) => (s ?? '').trim());
        const candidates = flat.length > 0 ? flat.filter(Boolean) : extractCandidates(String(results.data));
        const seen = new Set<string>();
        const valid: string[] = [];
        const invalid: string[] = [];

        for (const candidate of candidates) {
          if (!candidate) continue;
          if (!EMAIL_REGEX.test(candidate)) {
            invalid.push(candidate);
            continue;
          }
          const normalized = candidate.toLowerCase();
          if (seen.has(normalized)) continue;
          seen.add(normalized);
          valid.push(candidate);
        }

        resolve({ valid, invalid });
      },
      error: (err) => reject(err),
    });
  });
}
