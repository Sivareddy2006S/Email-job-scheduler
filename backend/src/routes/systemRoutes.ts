import { Router } from 'express';
import { systemController } from '../controllers/systemController';
import asyncHandler from '../utils/asyncHandler';

const router = Router();
router.get('/health', asyncHandler(systemController.health));

export default router;
