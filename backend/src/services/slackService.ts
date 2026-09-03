import { env } from '../config/env';
import { logger } from '../utils/logger';
import { slackRepository } from '../repositories/slackRepository';

const SLACK_OAUTH_AUTHORIZE_URL = 'https://slack.com/oauth/v2/authorize';
const SLACK_OAUTH_ACCESS_URL = 'https://slack.com/api/oauth.v2.access';
const SLACK_POST_MESSAGE_URL = 'https://slack.com/api/chat.postMessage';

interface SlackOAuthAccessResponse {
  ok: boolean;
  access_token?: string;
  team?: { id: string; name: string };
  authed_user?: { id: string };
  incoming_webhook?: { channel_id: string };
  error?: string;
}

export const slackService = {
  buildAuthorizeUrl(state: string): string {
    const params = new URLSearchParams({
      client_id: env.slack.clientId,
      scope: 'chat:write,channels:read',
      redirect_uri: env.slack.redirectUri,
      state,
    });
    return `${SLACK_OAUTH_AUTHORIZE_URL}?${params.toString()}`;
  },

  async exchangeCodeForToken(code: string): Promise<SlackOAuthAccessResponse> {
    const params = new URLSearchParams({
      client_id: env.slack.clientId,
      client_secret: env.slack.clientSecret,
      code,
      redirect_uri: env.slack.redirectUri,
    });

    const response = await fetch(SLACK_OAUTH_ACCESS_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: params.toString(),
    });

    const data = (await response.json()) as SlackOAuthAccessResponse;
    if (!data.ok) {
      throw new Error(`Slack OAuth exchange failed: ${data.error ?? 'unknown error'}`);
    }
    return data;
  },

  /**
   * Sends a real message via the Slack Web API using the user's stored
   * access token. Fails silently (logs only) if Slack is not connected or
   * the API call errors — Slack notifications must never break email
   * sending.
   */
  async notifyRateLimitReached(userId: string, senderEmail: string, limit: number): Promise<void> {
    try {
      const connection = await slackRepository.findByUserId(userId);
      if (!connection) {
        logger.debug({ userId }, 'Slack not connected; skipping rate-limit notification');
        return;
      }

      const text = `Email hourly rate limit reached for sender ${senderEmail}. Limit: ${limit} emails/hour. Additional emails have been delayed until the next available window.`;

      const response = await fetch(SLACK_POST_MESSAGE_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json; charset=utf-8',
          Authorization: `Bearer ${connection.accessToken}`,
        },
        body: JSON.stringify({
          channel: connection.channelId || connection.slackUserId,
          text,
        }),
      });

      const data = (await response.json()) as { ok: boolean; error?: string };
      if (!data.ok) {
        logger.error({ error: data.error }, 'Slack notification failed');
      }
    } catch (err) {
      logger.error({ err }, 'Slack notification threw an error');
    }
  },
};
