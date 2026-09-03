import { prisma } from '../config/database';
import type { Email, EmailStatus } from '@prisma/client';
import { Prisma } from '@prisma/client';

export interface CreateEmailInput {
  userId: string;
  senderId: string | null;
  recipient: string;
  subject: string;
  body: string;
  scheduledAt: Date;
  idempotencyKey: string;
}

export const emailRepository = {
  async createMany(inputs: CreateEmailInput[]): Promise<void> {
    await prisma.email.createMany({ data: inputs, skipDuplicates: true });
  },

  async findByIdempotencyKey(idempotencyKey: string): Promise<Email | null> {
    return prisma.email.findUnique({ where: { idempotencyKey } });
  },

  async attachJobId(emailId: string, jobId: string): Promise<void> {
    await prisma.email.update({ where: { id: emailId }, data: { bullmqJobId: jobId } });
  },

  async findById(id: string): Promise<Email | null> {
    return prisma.email.findUnique({ where: { id } });
  },

  async listByStatus(userId: string, statuses: EmailStatus[], page: number, pageSize: number) {
    const where = { userId, status: { in: statuses } };
    const [items, total] = await Promise.all([
      prisma.email.findMany({
        where,
        orderBy: { scheduledAt: 'asc' },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      prisma.email.count({ where }),
    ]);
    return { items, total };
  },

  /**
   * Atomically transitions an email from "scheduled" to "processing".
   * Returns the number of rows updated (0 or 1) so callers can detect
   * whether they "won" the transition — this is the core of duplicate
   * prevention when multiple workers might pick up related jobs.
   */
  async markProcessingIfScheduled(id: string): Promise<number> {
    const result = await prisma.$executeRaw`
      UPDATE emails
      SET status = 'processing', updated_at = now()
      WHERE id = ${id} AND status IN ('scheduled', 'failed')
    `;
    return result;
  },

  async markSent(id: string, sentAt: Date, previewUrl?: string): Promise<void> {
    await prisma.email.update({
      where: { id },
      data: { status: 'sent', sentAt, previewUrl },
    });
  },

  async markFailed(id: string, reason: string): Promise<void> {
    await prisma.email.update({
      where: { id },
      data: { status: 'failed', failureReason: reason },
    });
  },

  async resetToScheduled(id: string, newScheduledAt: Date): Promise<void> {
    await prisma.email.update({
      where: { id },
      data: { status: 'scheduled', scheduledAt: newScheduledAt },
    });
  },

  async searchInPostgres(userId: string, query: string): Promise<Email[]> {
    // Fallback search used only if Elasticsearch is unavailable.
    return prisma.email.findMany({
      where: {
        userId,
        OR: [
          { recipient: { contains: query, mode: Prisma.QueryMode.insensitive } },
          { subject: { contains: query, mode: Prisma.QueryMode.insensitive } },
          { body: { contains: query, mode: Prisma.QueryMode.insensitive } },
        ],
      },
      take: 50,
      orderBy: { createdAt: 'desc' },
    });
  },
};
