import type { Request, Response } from 'express';
import type { User } from '@prisma/client';

export const authController = {
  me(req: Request, res: Response): void {
    if (!req.isAuthenticated || !req.isAuthenticated()) {
      res.status(401).json({ error: 'Not authenticated' });
      return;
    }
    const user = req.user as User;
    res.json({
      id: user.id,
      name: user.name,
      email: user.email,
      avatarUrl: user.avatarUrl,
    });
  },

  logout(req: Request, res: Response): void {
    req.logout((err) => {
      if (err) {
        res.status(500).json({ error: 'Failed to log out' });
        return;
      }
      req.session.destroy(() => {
        res.clearCookie('connect.sid');
        res.json({ success: true });
      });
    });
  },
};
