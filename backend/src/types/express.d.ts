import type { User as PrismaUser } from '@prisma/client';

declare global {
  namespace Express {
    // Extend Passport's Express.User with our Prisma User shape.
    // eslint-disable-next-line @typescript-eslint/no-empty-interface
    interface User extends PrismaUser {}
  }
}

export {};
