import { prisma } from '../config/database';
import type { SlackConnection } from '@prisma/client';

interface UpsertSlackInput {
  userId: string;
  accessToken: string;
  teamId?: string;
  teamName?: string;
  slackUserId?: string;
  channelId?: string;
}

export const slackRepository = {
  async upsert(input: UpsertSlackInput): Promise<SlackConnection> {
    return prisma.slackConnection.upsert({
      where: { userId: input.userId },
      update: { ...input },
      create: { ...input },
    });
  },

  async findByUserId(userId: string): Promise<SlackConnection | null> {
    return prisma.slackConnection.findUnique({ where: { userId } });
  },

  async delete(userId: string): Promise<void> {
    await prisma.slackConnection.deleteMany({ where: { userId } });
  },
};
