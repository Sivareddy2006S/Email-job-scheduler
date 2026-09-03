export interface User {
  id: string;
  name: string;
  email: string;
  avatarUrl?: string | null;
}

export type EmailStatus = 'scheduled' | 'processing' | 'sent' | 'failed';

export interface EmailRecord {
  id: string;
  userId: string;
  senderId: string | null;
  recipient: string;
  subject: string;
  body: string;
  scheduledAt: string;
  sentAt: string | null;
  status: EmailStatus;
  bullmqJobId: string | null;
  failureReason: string | null;
  previewUrl: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface ScheduleRequest {
  subject: string;
  body: string;
  startTime: string;
  delayBetweenEmails: number;
  hourlyLimit: number;
  recipients: string[];
}

export interface ScheduleResponse {
  scheduledCount: number;
  totalRecipients: number;
  validRecipients: number;
  invalidRecipients: string[];
  senderId: string;
}

export interface PaginatedEmails {
  items: EmailRecord[];
  total: number;
  page: number;
  pageSize: number;
}

export interface SlackConnection {
  connected: boolean;
  teamName: string | null;
}

export interface ApiErrorResponse {
  error: string;
}
