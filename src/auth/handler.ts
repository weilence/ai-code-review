import { Hono } from 'hono';
import { CopilotAuthHandler, type CopilotTokenStorage } from '../ai/providers/github-copilot';
import { createLogger } from '../utils/logger';

const logger = createLogger('auth');

const SUPPORTED_PROVIDERS = ['copilot'] as const;

export function createAuthRoutes(copilotTokenStorage: CopilotTokenStorage): Hono {
  const app = new Hono();

  app.post('/login', async (c) => {
    const provider = c.req.query('provider');

    if (!provider) {
      return c.json(
        {
          success: false,
          message: 'Missing required query parameter: provider',
          supported_providers: SUPPORTED_PROVIDERS,
        },
        400,
      );
    }

    if (provider === 'copilot') {
      logger.info({ provider }, 'Auth login request');
      const handler = new CopilotAuthHandler(copilotTokenStorage);

      return handler.handleLogin(c);
    }

    return c.json(
      {
        success: false,
        message: `Unknown provider: ${provider}`,
        supported_providers: SUPPORTED_PROVIDERS,
      },
      400,
    );
  });

  return app;
}
