import { schedulingService } from './src/services/schedulingService';
import { prisma } from './src/config/database';
import { emailQueue } from './src/queues/emailQueue';
import { createRedisConnection } from './src/config/redis';
import { Queue } from 'bullmq';

async function runVerification() {
  const userId = '85e947bf-5257-4624-9ede-447ad0076323';
  const userEmail = 'testuser@example.com';
  
  console.log('Clearing queue...');
  const queue = new Queue('email-queue', { connection: createRedisConnection() });
  await queue.drain();

  // Clear previous Redis rate limit keys to ensure a clean slate
  const redis = createRedisConnection();
  const keys = await redis.keys('rate_limit:*');
  if (keys.length > 0) await redis.del(keys);

  const payload = {
    subject: `End-to-End Test ${Date.now()}`,
    body: 'Test body',
    startTime: new Date().toISOString(),
    delayBetweenEmails: 2000,
    hourlyLimit: 2,
    recipients: ['test1@example.com', 'test2@example.com', 'test3@example.com'],
    senderId: 'e260282b-e6e2-4840-baa8-3b5acd7bf89b'
  };

  const newSender = await prisma.sender.create({
    data: {
      userId,
      displayName: 'Test Sender',
      email: 'new' + Date.now() + '@example.com'
    }
  });
  payload.senderId = newSender.id;

  console.log('Scheduling 3 emails...');
  const result = await schedulingService.scheduleEmails(userId, userEmail, payload);
  console.log('Scheduled:', result);

  console.log('Waiting 10 seconds to allow jobs to process...');
  await new Promise(resolve => setTimeout(resolve, 10000));

  console.log('Checking database statuses...');
  const emails = await prisma.email.findMany({
    where: { subject: payload.subject },
    orderBy: { recipient: 'asc' }
  });

  emails.forEach(e => {
    console.log(`Email to ${e.recipient}: Status=${e.status}, scheduledAt=${e.scheduledAt}, sentAt=${e.sentAt}`);
  });

  const delayedCount = await queue.getDelayedCount();
  const completedCount = await queue.getCompletedCount();
  const failedCount = await queue.getFailedCount();
  console.log(`Queue stats: Delayed=${delayedCount}, Completed=${completedCount}, Failed=${failedCount}`);

  process.exit(0);
}

runVerification().catch(err => {
  console.error(err);
  process.exit(1);
});
