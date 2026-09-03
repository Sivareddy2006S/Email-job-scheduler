import { Router } from 'express';
import { createBullBoard } from '@bull-board/api';
import { BullMQAdapter } from '@bull-board/api/bullMQAdapter';
import { ExpressAdapter } from '@bull-board/express';
import { emailQueue } from './queues/emailQueue';
import { env } from './config/env';

/**
 * Bull Board is mounted at /admin/queues and protected with HTTP Basic Auth
 * for local/demo usage. In a real production deployment this should sit
 * behind proper SSO/network restrictions.
 */
export function createBullBoardRouter(): Router {
  const serverAdapter = new ExpressAdapter();
  serverAdapter.setBasePath('/admin/queues');

  createBullBoard({
    queues: [new BullMQAdapter(emailQueue)],
    serverAdapter,
  });

  const router = Router();

  router.use((req, res, next) => {
    const auth = req.headers.authorization;
    const expected = `Basic ${Buffer.from(`${env.bullBoard.user}:${env.bullBoard.password}`).toString('base64')}`;
    if (auth !== expected) {
      res.set('WWW-Authenticate', 'Basic realm="Bull Board"');
      res.status(401).send('Authentication required');
      return;
    }
    next();
  });

  router.use('/', serverAdapter.getRouter());
  return router;
}
