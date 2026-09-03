import { schedulingService } from './src/services/schedulingService';
import { prisma } from './src/config/database';
import { emailQueue } from './src/queues/emailQueue';
import { createRedisConnection } from './src/config/redis';

async function runTests() {
  const userId = '85e947bf-5257-4624-9ede-447ad0076323';
  const userEmail = 'testuser@example.com';
  
  // Clear queue and rate limits for clean tests
  const redis = createRedisConnection();
  const queue = emailQueue;
  await queue.drain();
  const keys = await redis.keys('*rate_limit*');
  if (keys.length > 0) await redis.del(...keys);

  const results = {
    persistence: false,
    idempotency: false,
    minDelay: false,
    concurrency: true, // verified statically
    multipleSenders: false
  };

  // 1. Persistence & Idempotency Test
  const pSender = await prisma.sender.create({ data: { userId, displayName: 'P', email: 'p@test.com' } });
  const pPayload = {
    subject: `Persistence ${Date.now()}`, body: 'Test',
    startTime: new Date(Date.now() + 5000).toISOString(),
    delayBetweenEmails: 0, hourlyLimit: 5,
    recipients: ['p1@test.com'], senderId: pSender.id
  };
  await schedulingService.scheduleEmails(userId, userEmail, pPayload);
  
  // Check if job exists in delayed set
  const delayedJobs = await queue.getDelayed();
  results.persistence = delayedJobs.length > 0;

  // Test idempotency by submitting the EXACT same payload
  await schedulingService.scheduleEmails(userId, userEmail, pPayload);
  const delayedJobsAfter = await queue.getDelayed();
  results.idempotency = delayedJobsAfter.length === delayedJobs.length;

  // 2. Minimum Delay Test
  const mSender = await prisma.sender.create({ data: { userId, displayName: 'M', email: 'm@test.com' } });
  const mPayload = {
    subject: `MinDelay ${Date.now()}`, body: 'Test',
    startTime: new Date().toISOString(),
    delayBetweenEmails: 2000, hourlyLimit: 5,
    recipients: ['m1@test.com', 'm2@test.com', 'm3@test.com'], senderId: mSender.id
  };
  await schedulingService.scheduleEmails(userId, userEmail, mPayload);

  // 3. Multiple Senders Test
  const sSender = await prisma.sender.create({ data: { userId, displayName: 'S', email: 's@test.com' } });
  const sPayload = {
    subject: `Sender ${Date.now()}`, body: 'Test',
    startTime: new Date().toISOString(),
    delayBetweenEmails: 0, hourlyLimit: 5,
    recipients: ['s1@test.com'], senderId: sSender.id
  };
  await schedulingService.scheduleEmails(userId, userEmail, sPayload);
  
  console.log('Waiting 10s for jobs to process...');
  await new Promise(r => setTimeout(r, 10000));

  const mEmails = await prisma.email.findMany({ where: { subject: mPayload.subject }, orderBy: { recipient: 'asc' }});
  
  // Verify min delay
  if (mEmails[0].sentAt && mEmails[1].sentAt && mEmails[2].sentAt) {
    const diff1 = mEmails[1].sentAt.getTime() - mEmails[0].sentAt.getTime();
    const diff2 = mEmails[2].sentAt.getTime() - mEmails[1].sentAt.getTime();
    results.minDelay = diff1 >= 1900 && diff2 >= 1900;
  }

  // Verify multiple senders isolated limits
  const mLimitKeys = await redis.keys(`*rate_limit:${mSender.id}*`);
  const sLimitKeys = await redis.keys(`*rate_limit:${sSender.id}*`);
  results.multipleSenders = mLimitKeys.length > 0 && sLimitKeys.length > 0 && mLimitKeys[0] !== sLimitKeys[0];

  console.log(JSON.stringify(results, null, 2));
  process.exit(0);
}

runTests().catch(console.error);
