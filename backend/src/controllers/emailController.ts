import type { Request, Response } from 'express';
import { z } from 'zod';
import type { User } from '@prisma/client';
import { schedulingService } from '../services/schedulingService';
import { emailRepository } from '../repositories/emailRepository';
import { elasticsearchService } from '../services/elasticsearchService';
import { prisma } from '../config/database';
import { ValidationError } from '../utils/AppError';

export const scheduleEmailSchema = z.object({
  subject: z.string().min(1, 'Subject is required'),
  body: z.string().min(1, 'Body is required'),
  startTime: z.string().min(1, 'startTime is required'),
  delayBetweenEmails: z.number().int().nonnegative(),
  hourlyLimit: z.number().int().positive(),
  recipients: z.array(z.string()).min(1, 'At least one recipient is required'),
  senderId: z.string().uuid().optional(),
});

const PAGE_SIZE = 20;

export const emailController = {
  async schedule(req: Request, res: Response): Promise<void> {
    const user = req.user as User;
    const result = await schedulingService.scheduleEmails(user.id, user.email, req.body);
    res.status(201).json(result);
  },

  async listScheduled(req: Request, res: Response): Promise<void> {
    const user = req.user as User;
    const page = parseInt((req.query.page as string) ?? '1', 10);
    const { items, total } = await emailRepository.listByStatus(
      user.id,
      ['scheduled', 'processing'],
      page,
      PAGE_SIZE
    );
    res.json({ items, total, page, pageSize: PAGE_SIZE });
  },

  async listSent(req: Request, res: Response): Promise<void> {
    const user = req.user as User;
    const page = parseInt((req.query.page as string) ?? '1', 10);
    const { items, total } = await emailRepository.listByStatus(
      user.id,
      ['sent', 'failed'],
      page,
      PAGE_SIZE
    );
    res.json({ items, total, page, pageSize: PAGE_SIZE });
  },

  async getById(req: Request, res: Response): Promise<void> {
    const email = await emailRepository.findById(req.params.id);
    if (!email) {
      res.status(404).json({ error: 'Email not found' });
      return;
    }
    res.json(email);
  },

  async search(req: Request, res: Response): Promise<void> {
    const user = req.user as User;
    const query = (req.query.q as string) ?? '';
    if (!query.trim()) {
      throw new ValidationError('Query parameter "q" is required');
    }

    const ids = await elasticsearchService.search(user.id, query);
    let items;
    if (ids.length > 0) {
      items = await prisma.email.findMany({ where: { id: { in: ids }, userId: user.id } });
    } else {
      // Fallback to Postgres ILIKE search if Elasticsearch is unavailable or returns nothing.
      items = await emailRepository.searchInPostgres(user.id, query);
    }
    res.json({ items, query });
  },
};
