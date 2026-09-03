import { createHash } from 'crypto';
import { emailRepository } from '../repositories/emailRepository';
import { senderRepository } from '../repositories/senderRepository';
import { enqueueEmailJob } from '../queues/emailQueue';
import { dedupeAndValidateEmails } from '../utils/emailValidation';
import { env } from '../config/env';
import { ValidationError } from '../utils/AppError';
import { logger } from '../utils/logger';
import type { ScheduleEmailRequest } from '../types';

function buildIdempotencyKey(userId: string, recipient: string, subject: string, scheduledAtMs: number): string {
  const raw = `${userId}:${recipient.toLowerCase()}:${subject}:${scheduledAtMs}`;
  return createHash('sha256').update(raw).digest('hex');
}

export const schedulingService = {
  async scheduleEmails(userId: string, userEmail: string, req: ScheduleEmailRequest) {
    const { valid, invalid } = dedupeAndValidateEmails(req.recipients);
    if (valid.length === 0) {
      throw new ValidationError('No valid recipient email addresses were provided');
    }

    const startTime = new Date(req.startTime);
    if (Number.isNaN(startTime.getTime())) {
      throw new ValidationError('startTime must be a valid date');
    }

    const delayBetweenEmails = Math.max(req.delayBetweenEmails, env.emailMinDelayMs);
    const hourlyLimit = req.hourlyLimit > 0 ? req.hourlyLimit : env.maxEmailsPerHour;

    const sender = req.senderId
      ? await senderRepository.findById(req.senderId)
      : await senderRepository.getOrCreateDefaultSender(userId, userEmail);

    const now = Date.now();
    const created: { id: string; recipient: string; scheduledAt: Date; idempotencyKey: string }[] = [];

    for (let i = 0; i < valid.length; i++) {
      const recipient = valid[i];
      const scheduledAtMs = startTime.getTime() + i * delayBetweenEmails;
      const idempotencyKey = buildIdempotencyKey(userId, recipient, req.subject, scheduledAtMs);

      const existing = await emailRepository.findByIdempotencyKey(idempotencyKey);
      if (existing) {
        // Duplicate submission (e.g. retried request) — do not create or
        // enqueue again.
        created.push({
          id: existing.id,
          recipient,
          scheduledAt: existing.scheduledAt,
          idempotencyKey,
        });
        continue;
      }

      const emailId = idempotencyKey; // deterministic, but Prisma still generates uuid default; override below
      created.push({
        id: emailId,
        recipient,
        scheduledAt: new Date(scheduledAtMs),
        idempotencyKey,
      });
    }

    // Persist all new records first (source of truth), then enqueue jobs.
    const toInsert = created.filter((c) => c.id === c.idempotencyKey);
    if (toInsert.length > 0) {
      await emailRepository.createMany(
        toInsert.map((c) => ({
          userId,
          senderId: sender.id,
          recipient: c.recipient,
          subject: req.subject,
          body: req.body,
          scheduledAt: c.scheduledAt,
          idempotencyKey: c.idempotencyKey,
        }))
      );
    }

    // Re-fetch to get actual DB-assigned ids (Prisma UUIDs), then enqueue.
    let enqueuedCount = 0;
    for (const item of created) {
      const record = await emailRepository.findByIdempotencyKey(item.idempotencyKey);
      if (!record) continue;
      if (record.status !== 'scheduled') continue; // already processed elsewhere

      const delayMs = record.scheduledAt.getTime() - now;
      try {
        const job = await enqueueEmailJob(
          {
            emailId: record.id,
            idempotencyKey: record.idempotencyKey,
            senderId: sender.id,
            hourlyLimit,
            minDelayMs: delayBetweenEmails,
          },
          delayMs
        );
        await emailRepository.attachJobId(record.id, job.id ?? record.idempotencyKey);
        enqueuedCount++;
      } catch (err) {
        // Job with this ID likely already exists in the queue — safe to ignore.
        logger.warn({ err, emailId: record.id }, 'Skipped enqueueing (job likely already exists)');
      }
    }

    return {
      scheduledCount: enqueuedCount,
      totalRecipients: req.recipients.length,
      validRecipients: valid.length,
      invalidRecipients: invalid,
      senderId: sender.id,
    };
  },
};
