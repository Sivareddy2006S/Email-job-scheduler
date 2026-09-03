import { Job, Worker, DelayedError } from 'bullmq';
import { createRedisConnection } from '../config/redis';
import { env } from '../config/env';
import { logger } from '../utils/logger';
import { EMAIL_QUEUE_NAME, enqueueEmailJob } from '../queues/emailQueue';
import { emailRepository } from '../repositories/emailRepository';
import { senderRepository } from '../repositories/senderRepository';
import { emailService } from '../services/emailService';
import { rateLimitService } from '../services/rateLimitService';
import { minDelayService } from '../services/minDelayService';
import { slackService } from '../services/slackService';
import { idempotencyService } from '../services/idempotencyService';
import { elasticsearchService } from '../services/elasticsearchService';
import type { EmailJobData } from '../types';
import { prisma } from '../config/database';

async function processEmailJob(job: Job<EmailJobData>): Promise<void> {
  const { emailId, senderId, hourlyLimit, minDelayMs } = job.data;

  const email = await emailRepository.findById(emailId);
  if (!email) {
    logger.warn({ emailId }, 'Email record not found; dropping job');
    return;
  }

  // Already sent (e.g. this job is a stale retry/duplicate) -> no-op.
  if (email.status === 'sent') {
    logger.info({ emailId }, 'Email already sent; skipping duplicate job');
    return;
  }

  // Atomically claim this email for processing. If another worker already
  // claimed it (stalled-job recovery racing with a normal retry), this
  // returns 0 and we simply stop — the other execution owns the send.
  const claimed = await emailRepository.markProcessingIfScheduled(emailId);
  if (claimed === 0) {
    logger.info({ emailId }, 'Email already claimed by another execution; skipping');
    return;
  }

  const sender = senderId ? await senderRepository.findById(senderId) : null;
  const senderKey = senderId ?? 'default-sender';
  const senderLabel = sender?.email ?? email.recipient;

  try {
    // 1. Enforce minimum spacing between sends for this sender, safe
    //    across concurrent workers.
    const waitMs = await minDelayService.checkAndReserve(senderKey, minDelayMs);
    if (waitMs > 0) {
      const newScheduledAt = new Date(Date.now() + waitMs);
      logger.info({ emailId, waitMs }, 'Minimum delay not yet satisfied; deferring email');
      await emailRepository.resetToScheduled(email.id, newScheduledAt);
      await job.moveToDelayed(Date.now() + waitMs, job.token);
      throw new DelayedError();
    }

    // 2. Enforce the hourly rate limit (distributed, Redis-backed).
    const rateLimitResult = await rateLimitService.tryReserveSlot(senderKey, hourlyLimit);
    if (!rateLimitResult.allowed) {
      const shouldNotify = await idempotencyService.claimRateLimitNotification(
        senderKey,
        rateLimitResult.windowKey
      );
      if (shouldNotify) {
        await slackService.notifyRateLimitReached(email.userId, senderLabel, rateLimitResult.limit);
      }

      const nextWindowMs = rateLimitService.msUntilNextWindow();
      const newScheduledAt = new Date(Date.now() + nextWindowMs);
      logger.info(
        { emailId, senderKey, nextWindowMs },
        'Hourly limit reached; deferring email to next window'
      );
      await emailRepository.resetToScheduled(email.id, newScheduledAt);
      await job.moveToDelayed(Date.now() + nextWindowMs, job.token);
      throw new DelayedError();
    }

    // 3. Send via Ethereal SMTP.
    const result = await emailService.send({
      sender,
      to: email.recipient,
      subject: email.subject,
      body: email.body,
    });

    // 4. Mark sent atomically; this is the durable record of success.
    await emailRepository.markSent(emailId, new Date(), result.previewUrl);

    // 5. Best-effort search indexing.
    const updated = await emailRepository.findById(emailId);
    if (updated) await elasticsearchService.indexEmail(updated);

    logger.info({ emailId, to: email.recipient, previewUrl: result.previewUrl }, 'Email sent');
  } catch (err) {
    const attemptsMade = job.attemptsMade + 1;
    const maxAttempts = job.opts.attempts ?? 1;

    if (attemptsMade >= maxAttempts) {
      logger.error({ err, emailId }, 'Email permanently failed after max attempts');
      await emailRepository.markFailed(emailId, (err as Error).message ?? 'Unknown error');
    } else {
      // Revert to "scheduled" so the upcoming BullMQ retry (or a future
      // worker restart recovering a stalled job) is allowed to claim it
      // again via markProcessingIfScheduled.
      logger.warn({ err, emailId, attemptsMade, maxAttempts }, 'Email send failed; will retry');
      await prisma.email.update({ where: { id: emailId }, data: { status: 'scheduled' } });
    }
    throw err;
  }
}

export function startEmailWorker(): Worker<EmailJobData> {
  const worker = new Worker<EmailJobData>(EMAIL_QUEUE_NAME, processEmailJob, {
    connection: createRedisConnection(),
    concurrency: env.workerConcurrency,
  });

  worker.on('completed', (job) => logger.debug({ jobId: job.id }, 'Job completed'));
  worker.on('failed', (job, err) =>
    logger.error({ jobId: job?.id, err }, 'Job failed (will retry if attempts remain)')
  );
  worker.on('error', (err) => logger.error({ err }, 'Worker error'));

  return worker;
}
