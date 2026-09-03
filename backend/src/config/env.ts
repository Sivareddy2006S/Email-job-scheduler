import dotenv from 'dotenv';
dotenv.config();

function required(name: string, fallback?: string): string {
  const value = process.env[name] ?? fallback;
  if (value === undefined) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
}

export const env = {
  nodeEnv: process.env.NODE_ENV ?? 'development',
  port: parseInt(process.env.PORT ?? '4000', 10),
  frontendUrl: required('FRONTEND_URL', 'http://localhost:5173'),
  backendUrl: required('BACKEND_URL', 'http://localhost:4000'),
  sessionSecret: required('SESSION_SECRET', 'dev-secret-change-me'),

  databaseUrl: required('DATABASE_URL'),
  redisUrl: required('REDIS_URL', 'redis://localhost:6379'),

  elasticsearchUrl: required('ELASTICSEARCH_URL', 'http://localhost:9200'),
  elasticsearchEmailsIndex: process.env.ELASTICSEARCH_EMAILS_INDEX ?? 'emails',

  google: {
    clientId: process.env.GOOGLE_CLIENT_ID ?? '',
    clientSecret: process.env.GOOGLE_CLIENT_SECRET ?? '',
    callbackUrl: process.env.GOOGLE_CALLBACK_URL ?? 'http://localhost:4000/api/auth/google/callback',
  },

  slack: {
    clientId: process.env.SLACK_CLIENT_ID ?? '',
    clientSecret: process.env.SLACK_CLIENT_SECRET ?? '',
    redirectUri: process.env.SLACK_REDIRECT_URI ?? 'http://localhost:4000/api/slack/callback',
  },

  ethereal: {
    host: process.env.ETHEREAL_HOST ?? 'smtp.ethereal.email',
    port: parseInt(process.env.ETHEREAL_PORT ?? '587', 10),
    user: process.env.ETHEREAL_USER ?? '',
    password: process.env.ETHEREAL_PASSWORD ?? '',
  },

  workerConcurrency: parseInt(process.env.WORKER_CONCURRENCY ?? '5', 10),
  emailMinDelayMs: parseInt(process.env.EMAIL_MIN_DELAY_MS ?? '2000', 10),
  maxEmailsPerHour: parseInt(process.env.MAX_EMAILS_PER_HOUR ?? '100', 10),

  bullBoard: {
    user: process.env.BULL_BOARD_USER ?? 'admin',
    password: process.env.BULL_BOARD_PASSWORD ?? 'admin',
  },
};
