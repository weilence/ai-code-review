import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { logger as honoLogger } from 'hono/logger';
import { createWebhookHandler } from './webhooks/handler';
import { createAuthRoutes } from './auth/handler';
import { createReviewRoutes } from './api/review';
import { createLogger } from './utils/logger';
import {
  reviewEngine,
  copilotTokenStorage,
  aiRegistry,
} from './bootstrap';
import { config } from './config';

const logger = createLogger('server');

const app = new Hono();

app.use('*', cors());
app.use('*', honoLogger());

app.get('/health', (c) => {
  return c.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    version: process.env.npm_package_version ?? '1.0.0',
  });
});

app.get('/ready', (c) => {
  const checks = {
    aiProviders: aiRegistry.getAllProviders().length > 0,
    gitlabConfigured: Boolean(config.gitlab.url && config.gitlab.token),
    webhookSecretConfigured: Boolean(config.gitlab.webhookSecret),
  };

  const allReady = Object.values(checks).every(Boolean);

  return c.json(
    {
      ready: allReady,
      checks,
      timestamp: new Date().toISOString(),
    },
    allReady ? 200 : 503,
  );
});

const webhookHandler = createWebhookHandler({
  webhookSecret: config.gitlab.webhookSecret,
  reviewEngine,
  eventsConfig: config.webhook,
});

app.post('/webhook', webhookHandler);

app.route('/auth', createAuthRoutes(copilotTokenStorage));

app.route('/api/review', createReviewRoutes({
  reviewEngine,
  gitlabUrl: config.gitlab.url,
}));

app.notFound((c) => {
  return c.json({ error: 'Not found' }, 404);
});

app.onError((err, c) => {
  logger.error({ error: err.message, stack: err.stack }, 'Unhandled error');

  return c.json(
    {
      error: 'Internal server error',
      message: process.env.NODE_ENV === 'development' ? err.message : undefined,
    },
    500,
  );
});

const port = config.port;
const host = config.host;

logger.info(
  {
    port,
    host,
  },
  'Starting AI Code Review server',
);

export default {
  port,
  hostname: host,
  fetch: app.fetch,
};
