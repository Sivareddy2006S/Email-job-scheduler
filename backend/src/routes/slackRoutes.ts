import { Router } from 'express';
import { requireAuth } from '../middleware/auth';
import { slackController } from '../controllers/slackController';
import asyncHandler from '../utils/asyncHandler';

const router = Router();

router.get('/connect', requireAuth, slackController.connect);
router.get('/callback', requireAuth, asyncHandler(slackController.callback));
router.get('/status', requireAuth, asyncHandler(slackController.status));
router.post('/disconnect', requireAuth, asyncHandler(slackController.disconnect));

export default router;
