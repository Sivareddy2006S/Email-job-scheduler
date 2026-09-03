import { esClient } from '../config/elasticsearch';
import { env } from '../config/env';
import { logger } from '../utils/logger';
import type { Email } from '@prisma/client';

export const elasticsearchService = {
  async indexEmail(email: Email): Promise<void> {
    try {
      await esClient.index({
        index: env.elasticsearchEmailsIndex,
        id: email.id,
        document: {
          userId: email.userId,
          senderId: email.senderId,
          recipient: email.recipient,
          subject: email.subject,
          body: email.body,
          status: email.status,
          scheduledAt: email.scheduledAt,
          sentAt: email.sentAt,
        },
      });
    } catch (err) {
      // Search is a secondary concern; never let indexing failures break
      // the primary scheduling/sending flow.
      logger.error({ err, emailId: email.id }, 'Failed to index email in Elasticsearch');
    }
  },

  async search(userId: string, query: string): Promise<Email['id'][]> {
    try {
      const result = await esClient.search({
        index: env.elasticsearchEmailsIndex,
        query: {
          bool: {
            must: [{ term: { userId } }],
            should: [
              { match: { recipient: query } },
              { match: { subject: query } },
              { match: { body: query } },
            ],
            minimum_should_match: 1,
          },
        },
        size: 50,
      });
      return result.hits.hits.map((hit) => hit._id as string);
    } catch (err) {
      logger.error({ err }, 'Elasticsearch search failed');
      return [];
    }
  },
};
