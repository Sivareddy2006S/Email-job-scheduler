import { Router } from 'express';
import authRoutes from './authRoutes';
import emailRoutes from './emailRoutes';
import slackRoutes from './slackRoutes';
import systemRoutes from './systemRoutes';

const router = Router();

router.use('/auth', authRoutes);
router.use('/emails', emailRoutes);
router.use('/slack', slackRoutes);
router.use('/', systemRoutes);

export default router;
