import { Client } from '@elastic/elasticsearch';
import { env } from './env';
import { logger } from '../utils/logger';

export const esClient = new Client({ node: env.elasticsearchUrl });

export async function ensureEmailsIndex(): Promise<void> {
  try {
    const exists = await esClient.indices.exists({ index: env.elasticsearchEmailsIndex });
    if (!exists) {
      await esClient.indices.create({
        index: env.elasticsearchEmailsIndex,
        mappings: {
          properties: {
            userId: { type: 'keyword' },
            senderId: { type: 'keyword' },
            recipient: { type: 'text', fields: { keyword: { type: 'keyword' } } },
            subject: { type: 'text' },
            body: { type: 'text' },
            status: { type: 'keyword' },
            scheduledAt: { type: 'date' },
            sentAt: { type: 'date' },
          },
        },
      });
      logger.info(`Created Elasticsearch index "${env.elasticsearchEmailsIndex}"`);
    }
  } catch (err) {
    // Elasticsearch is not on the critical path for sending emails.
    logger.error({ err }, 'Failed to ensure Elasticsearch index (search will be degraded)');
  }
}
