const { Queue, Worker, DelayedError } = require('bullmq');
const { createRedisConnection } = require('./dist/config/redis');

async function test() {
  const queue = new Queue('test-queue', { connection: createRedisConnection() });
  await queue.drain();

  const worker = new Worker('test-queue', async (job) => {
    if (job.attemptsMade === 0) {
      console.log('Attempt 0: Delaying job');
      await job.moveToDelayed(Date.now() + 2000, job.token);
      throw new DelayedError();
    }
    console.log('Attempt 1: Processing normally');
    return 'done';
  }, { connection: createRedisConnection() });

  worker.on('completed', () => console.log('Job completed'));
  worker.on('failed', (j, err) => console.log('Job failed', err.message));

  await queue.add('test-job', {}, { jobId: '123' });
}

test();
