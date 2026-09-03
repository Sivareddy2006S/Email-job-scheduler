import { Queue, QueueEvents } from 'bullmq';
import { createRedisConnection } from '../config/redis';
import type { EmailJobData } from '../types';

export const EMAIL_QUEUE_NAME = 'email-queue';

// A dedicated connection for the Queue instance, per BullMQ recommendations.
const queueConnection = createRedisConnection();

export const emailQueue = new Queue<EmailJobData>(EMAIL_QUEUE_NAME, {
  connection: queueConnection,
  defaultJobOptions: {
    attempts: 5,
    backoff: { type: 'exponential', delay: 5000 },
    removeOnComplete: { age: 3600, count: 1000 },
    removeOnFail: { age: 24 * 3600 },
  },
});

export const emailQueueEvents = new QueueEvents(EMAIL_QUEUE_NAME, { connection: createRedisConnection() });

/**
 * Enqueues a delayed BullMQ job for a single email.
 *
 * The job ID is set to the email's idempotency key. BullMQ treats job IDs
 * as unique within a queue, so attempting to add a job with an ID that
 * already exists is a safe no-op-ish operation (it will throw/ignore
 * depending on version) — this is our first line of defense against
 * duplicate scheduling from retried API requests.
 */
export async function enqueueEmailJob(data: EmailJobData, delayMs: number) {
  const job = await emailQueue.add('send-email', data, {
    jobId: data.idempotencyKey,
    delay: Math.max(delayMs, 0),
  });
  return job;
}
