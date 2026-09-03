import { connectDatabase, disconnectDatabase } from '../config/database';
import { logger } from '../utils/logger';
import { startEmailWorker } from './emailWorker';

async function main() {
  await connectDatabase();
  const worker = startEmailWorker();
  logger.info('Email worker started');

  const shutdown = async () => {
    logger.info('Shutting down worker...');
    await worker.close();
    await disconnectDatabase();
    process.exit(0);
  };

  process.on('SIGINT', shutdown);
  process.on('SIGTERM', shutdown);
}

main().catch((err) => {
  logger.error({ err }, 'Worker process failed to start');
  process.exit(1);
});
