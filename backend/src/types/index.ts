import type { Email, EmailStatus, Sender, User } from '@prisma/client';

export type { Email, EmailStatus, Sender, User };

export interface ScheduleEmailRequest {
  subject: string;
  body: string;
  startTime: string; // ISO date string
  delayBetweenEmails: number; // ms, user-configured, floored by EMAIL_MIN_DELAY_MS
  hourlyLimit: number;
  recipients: string[];
  senderId?: string;
}

export interface RateLimitCheckResult {
  allowed: boolean;
  currentCount: number;
  limit: number;
  windowKey: string;
  retryAfterMs?: number;
}

export interface EmailJobData {
  emailId: string;
  idempotencyKey: string;
  senderId: string | null;
  hourlyLimit: number;
  minDelayMs: number;
}
