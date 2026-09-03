import { Router } from 'express';
import { passport } from '../config/passport';
import { authController } from '../controllers/authController';
import { env } from '../config/env';

const router = Router();

router.get('/google', passport.authenticate('google', { scope: ['profile', 'email'] }));

router.get(
  '/google/callback',
  passport.authenticate('google', { failureRedirect: `${env.frontendUrl}/login?error=1` }),
  (_req, res) => {
    res.redirect(`${env.frontendUrl}/dashboard`);
  }
);

router.get('/me', authController.me);
router.post('/logout', authController.logout);

export default router;
