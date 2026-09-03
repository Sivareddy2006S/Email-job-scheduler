import { Router } from 'express';
import { requireAuth } from '../middleware/auth';
import { validateBody } from '../middleware/validate';
import { emailController, scheduleEmailSchema } from '../controllers/emailController';
import asyncHandler from '../utils/asyncHandler';

const router = Router();

router.use(requireAuth);

router.post('/schedule', validateBody(scheduleEmailSchema), asyncHandler(emailController.schedule));
router.get('/scheduled', asyncHandler(emailController.listScheduled));
router.get('/sent', asyncHandler(emailController.listSent));
router.get('/search', asyncHandler(emailController.search));
router.get('/:id', asyncHandler(emailController.getById));

export default router;
