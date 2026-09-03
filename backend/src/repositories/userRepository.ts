import { prisma } from '../config/database';
import type { User } from '@prisma/client';

interface GoogleProfileInput {
  googleId: string;
  name: string;
  email: string;
  avatarUrl?: string;
}

export const userRepository = {
  async upsertFromGoogleProfile(input: GoogleProfileInput): Promise<User> {
    return prisma.user.upsert({
      where: { googleId: input.googleId },
      update: {
        name: input.name,
        email: input.email,
        avatarUrl: input.avatarUrl,
      },
      create: {
        googleId: input.googleId,
        name: input.name,
        email: input.email,
        avatarUrl: input.avatarUrl,
      },
    });
  },

  async findById(id: string): Promise<User | null> {
    return prisma.user.findUnique({ where: { id } });
  },
};
