import type { Request, Response, NextFunction } from 'express';
import { UnauthorizedError } from '../utils/AppError';

export function requireAuth(req: Request, _res: Response, next: NextFunction): void {
  if (!req.isAuthenticated || !req.isAuthenticated()) {
    return next(new UnauthorizedError('You must be logged in to perform this action'));
  }
  next();
}
