import { PrismaClient } from '@prisma/client';
import { logger } from '../utils/logger';

export const prisma = new PrismaClient({
  log: [
    { emit: 'event', level: 'error' },
    { emit: 'event', level: 'warn' },
  ],
});

// @ts-expect-error - prisma event typing quirk across versions
prisma.$on('error', (e: unknown) => logger.error({ err: e }, 'Prisma error'));
// @ts-expect-error - prisma event typing quirk across versions
prisma.$on('warn', (e: unknown) => logger.warn({ warn: e }, 'Prisma warning'));

export async function connectDatabase(): Promise<void> {
  await prisma.$connect();
  logger.info('Connected to PostgreSQL');
}

export async function disconnectDatabase(): Promise<void> {
  await prisma.$disconnect();
}
