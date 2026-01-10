import { streamSSE } from 'hono/streaming';
import type { Context } from 'hono';
import { getCopilotAuthClient } from './client';
import { DeviceCodeRequestSchema, type ErrorResponse } from './types';
import { CopilotAuthError } from '../../../utils/errors';
import { createLogger } from '../../../utils/logger';
import type { CopilotTokenStorage } from './token-storage';

const logger = createLogger('copilot-auth');

export class CopilotAuthHandler {
  constructor(private readonly tokenStorage: CopilotTokenStorage) {}

  async handleLogin(c: Context): Promise<Response> {
    const body: unknown = await c.req.json().catch(() => ({}));
    const parseResult = DeviceCodeRequestSchema.safeParse(body);

    if (!parseResult.success) {
      return c.json<ErrorResponse>(
        {
          success: false,
          message: 'Invalid request body',
          error: parseResult.error.issues[0]?.message,
        },
        400,
      );
    }

    const { enterprise_url } = parseResult.data;
    const client = getCopilotAuthClient({ enterpriseUrl: enterprise_url });

    logger.info({ enterprise_url }, 'Copilot login request received');

    return streamSSE(c, async (stream) => {
      const sendEvent = async (event: string, data: unknown) => {
        await stream.writeSSE({
          event,
          data: JSON.stringify(data),
        });
      };

      try {
        const deviceCode = await client.requestDeviceCode();

        await sendEvent('device_code', {
          user_code: deviceCode.user_code,
          verification_uri: deviceCode.verification_uri,
          expires_in: deviceCode.expires_in,
          message: `Please visit ${deviceCode.verification_uri} and enter code: ${deviceCode.user_code}`,
        });

        const interval = deviceCode.interval * 1000;
        const maxAttempts = Math.ceil(deviceCode.expires_in / deviceCode.interval);
        let refreshToken: string | null = null;

        for (let attempt = 1; attempt <= maxAttempts; attempt++) {
          await new Promise(resolve => setTimeout(resolve, interval));

          await sendEvent('polling', { attempt, max_attempts: maxAttempts });

          const result = await client.pollForAccessToken(deviceCode.device_code);

          if ('error' in result) {
            if (result.error === 'authorization_pending') {
              continue;
            }
            if (result.error === 'slow_down') {
              await new Promise(resolve => setTimeout(resolve, (result.interval ?? 5) * 1000));
              continue;
            }
            if (result.error === 'expired_token') {
              await sendEvent('error', { message: 'Device code expired. Please try again.' });

              return;
            }
            if (result.error === 'access_denied') {
              await sendEvent('error', { message: 'Authorization denied by user.' });

              return;
            }
            await sendEvent('error', { message: result.error_description ?? result.error });

            return;
          }

          refreshToken = result.access_token;
          await sendEvent('authorized', { message: 'GitHub authorization successful!' });
          break;
        }

        if (!refreshToken) {
          await sendEvent('error', { message: 'Timeout waiting for authorization.' });

          return;
        }

        await this.tokenStorage.set(refreshToken, {
          baseUrl: client.getBaseUrl(),
          enterpriseUrl: enterprise_url,
        });

        await sendEvent('success', {
          refresh_token: refreshToken,
          base_url: client.getBaseUrl(),
          message: 'Login successful. Copilot will be initialized on first use.',
        });

        logger.info('Copilot login completed successfully');
      } catch (error) {
        logger.error({ error }, 'Copilot login failed');

        const message = error instanceof CopilotAuthError
          ? error.message
          : 'Internal server error';

        await sendEvent('error', { message });
      }
    });
  }
}
