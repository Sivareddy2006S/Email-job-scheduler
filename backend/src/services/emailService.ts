import nodemailer, { Transporter } from 'nodemailer';
import { env } from '../config/env';
import { logger } from '../utils/logger';
import type { Sender } from '@prisma/client';

export interface SendEmailResult {
  messageId: string;
  previewUrl?: string;
}

let sharedTransporter: Transporter | null = null;

function getTransporter(sender: Sender | null): Transporter {
  // Reuse a single pooled transporter for the default configured account
  if (!sender?.etherealUsername && !sender?.etherealPassword) {
    if (!sharedTransporter) {
      sharedTransporter = nodemailer.createTransport({
        pool: true,
        maxConnections: 2,
        host: env.ethereal.host,
        port: env.ethereal.port,
        secure: false,
        auth: { user: env.ethereal.user, pass: env.ethereal.password },
      });
    }
    return sharedTransporter;
  }

  // Create a dedicated pooled one for senders with their own credentials
  return nodemailer.createTransport({
    pool: true,
    maxConnections: 2,
    host: env.ethereal.host,
    port: env.ethereal.port,
    secure: false,
    auth: {
      user: sender?.etherealUsername || env.ethereal.user,
      pass: sender?.etherealPassword || env.ethereal.password,
    },
  });
}

export const emailService = {
  async send(params: {
    sender: Sender | null;
    to: string;
    subject: string;
    body: string;
  }): Promise<SendEmailResult> {
    const transporter = getTransporter(params.sender);
    const fromAddress = params.sender?.email ?? env.ethereal.user;

    const info = await transporter.sendMail({
      from: `"${params.sender?.displayName ?? 'Email Scheduler'}" <${fromAddress}>`,
      to: params.to,
      subject: params.subject,
      text: params.body,
      html: `<p>${params.body.replace(/\n/g, '<br/>')}</p>`,
    });

    const previewUrl = nodemailer.getTestMessageUrl(info) || undefined;
    if (previewUrl) {
      logger.info({ previewUrl, to: params.to }, 'Ethereal preview URL');
    }

    return { messageId: info.messageId, previewUrl };
  },
};
