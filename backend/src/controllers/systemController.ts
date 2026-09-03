import type { Request, Response } from 'express';
import { prisma } from '../config/database';
import { redisClient } from '../config/redis';
import { esClient } from '../config/elasticsearch';

export const systemController = {
  async health(_req: Request, res: Response): Promise<void> {
    const checks: Record<string, string> = {};

    try {
      await prisma.$queryRaw`SELECT 1`;
      checks.postgres = 'ok';
    } catch {
      checks.postgres = 'down';
    }

    try {
      await redisClient.ping();
      checks.redis = 'ok';
    } catch {
      checks.redis = 'down';
    }

    try {
      await esClient.ping();
      checks.elasticsearch = 'ok';
    } catch {
      checks.elasticsearch = 'down';
    }

    const healthy = Object.values(checks).every((v) => v === 'ok');
    res.status(healthy ? 200 : 503).json({ status: healthy ? 'ok' : 'degraded', checks });
  },
};
