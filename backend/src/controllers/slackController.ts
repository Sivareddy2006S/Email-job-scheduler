import type { Request, Response } from 'express';
import { randomUUID } from 'crypto';
import type { User } from '@prisma/client';
import { slackService } from '../services/slackService';
import { slackRepository } from '../repositories/slackRepository';
import { env } from '../config/env';

export const slackController = {
  connect(req: Request, res: Response): void {
    const state = randomUUID();
    req.session.slackOAuthState = state;
    const url = slackService.buildAuthorizeUrl(state);
    res.redirect(url);
  },

  async callback(req: Request, res: Response): Promise<void> {
    const { code, state } = req.query as { code?: string; state?: string };
    const user = req.user as User;

    if (!code || !state || state !== req.session.slackOAuthState) {
      res.redirect(`${env.frontendUrl}/dashboard?slack=error`);
      return;
    }

    try {
      const tokenResponse = await slackService.exchangeCodeForToken(code);
      await slackRepository.upsert({
        userId: user.id,
        accessToken: tokenResponse.access_token ?? '',
        teamId: tokenResponse.team?.id,
        teamName: tokenResponse.team?.name,
        slackUserId: tokenResponse.authed_user?.id,
        channelId: tokenResponse.incoming_webhook?.channel_id,
      });
      res.redirect(`${env.frontendUrl}/dashboard?slack=connected`);
    } catch (err) {
      res.redirect(`${env.frontendUrl}/dashboard?slack=error`);
    }
  },

  async status(req: Request, res: Response): Promise<void> {
    const user = req.user as User;
    const connection = await slackRepository.findByUserId(user.id);
    res.json({ connected: !!connection, teamName: connection?.teamName ?? null });
  },

  async disconnect(req: Request, res: Response): Promise<void> {
    const user = req.user as User;
    await slackRepository.delete(user.id);
    res.json({ success: true });
  },
};
