import { createRedisConnection } from './src/config/redis';
import { Queue } from 'bullmq';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();
const emailQueue = new Queue('email-queue', { connection: createRedisConnection() });

async function runTest() {
  const senderId = 'e260282b-e6e2-4840-baa8-3b5acd7bf89b';
  
  // create 3 emails
  for (let i = 0; i < 3; i++) {
    const email = await prisma.email.create({
      data: {
        userId: '85e947bf-5257-4624-9ede-447ad0076323',
        senderId,
        recipient: 'test@example.com',
        subject: `Test ${i}`,
        body: 'Test body',
        status: 'scheduled',
        scheduledAt: new Date()
      }
    });

    await emailQueue.add('send-email', {
      emailId: email.id,
      senderId,
      hourlyLimit: 2,
      minDelayMs: 0
    });
    console.log(`Enqueued email ${email.id}`);
  }
}

runTest().then(() => {
  console.log('Done');
  process.exit(0);
});
