import { createApp } from './app';
import { env } from './config/env';
import { logger } from './utils/logger';
import { connectDatabase } from './config/database';
import { ensureEmailsIndex } from './config/elasticsearch';

async function main() {
  await connectDatabase();
  await ensureEmailsIndex();

  const app = createApp();
  app.listen(env.port, () => {
    logger.info(`API server listening on ${env.backendUrl}`);
    logger.info(`Bull Board available at ${env.backendUrl}/admin/queues`);
  });
}

main().catch((err) => {
  logger.error({ err }, 'Failed to start server');
  process.exit(1);
});
