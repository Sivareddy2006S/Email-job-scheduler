import { prisma } from '../config/database';
import type { Sender } from '@prisma/client';
import { env } from '../config/env';

export const senderRepository = {
  async listForUser(userId: string): Promise<Sender[]> {
    return prisma.sender.findMany({ where: { userId }, orderBy: { createdAt: 'asc' } });
  },

  async findById(id: string): Promise<Sender | null> {
    return prisma.sender.findUnique({ where: { id } });
  },

  /**
   * Ensures every user has at least one default sender, backed by the
   * shared Ethereal test account configured via environment variables.
   * In a real product each user would connect/verify their own sender.
   */
  async getOrCreateDefaultSender(userId: string, userEmail: string): Promise<Sender> {
    const existing = await prisma.sender.findFirst({ where: { userId } });
    if (existing) return existing;

    return prisma.sender.create({
      data: {
        userId,
        email: userEmail,
        displayName: userEmail,
        etherealUsername: env.ethereal.user,
        etherealPassword: env.ethereal.password,
      },
    });
  },
};
