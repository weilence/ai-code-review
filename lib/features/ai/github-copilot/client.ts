import { createLogger } from '@/lib/utils/logger';
import {
  DeviceCodeResponseSchema,
  OAuthTokenResponseSchema,
  OAuthErrorSchema,
  CopilotTokenResponseSchema,
  type DeviceCodeResponse,
  type OAuthTokenResponse,
  type CopilotTokenResponse,
  type OAuthError,
} from './types';

const logger = createLogger('copilot-client');

const GITHUB_CLIENT_ID = 'Iv1.b507a08c87ecfe98';
const SCOPE = 'read:user';

export const HEADERS = {
  'User-Agent': 'GitHubCopilotChat/0.35.0',
  'Editor-Version': 'vscode/1.107.0',
  'Editor-Plugin-Version': 'copilot-chat/0.35.0',
  'Copilot-Integration-Id': 'vscode-chat',
};

function normalizeDomain(url: string): string {
  return url.replace(/^https?:\/\//, '').replace(/\/$/, '');
}

export class CopilotAuthClient {
  private readonly domain: string;

  constructor(enterpriseUrl?: string) {
    this.domain = enterpriseUrl ? normalizeDomain(enterpriseUrl) : 'github.com';
  }

  async requestDeviceCode(): Promise<DeviceCodeResponse> {
    logger.debug({ domain: this.domain }, 'Requesting device code');

    const response = await fetch(`https://${this.domain}/login/device/code`, {
      method: 'POST',
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json',
        'User-Agent': HEADERS['User-Agent'],
      },
      body: JSON.stringify({ client_id: GITHUB_CLIENT_ID, scope: SCOPE }),
    });

    if (!response.ok) {
      throw new Error(`Failed to request device code: ${response.status}`);
    }

    const result = DeviceCodeResponseSchema.safeParse(await response.json());

    if (!result.success) {
      throw new Error('Invalid response from GitHub');
    }

    logger.info({ user_code: result.data.user_code }, 'Device code obtained');

    return result.data;
  }

  async pollForAccessToken(deviceCode: string): Promise<OAuthTokenResponse | OAuthError> {
    logger.debug('Polling for access token');

    const response = await fetch(`https://${this.domain}/login/oauth/access_token`, {
      method: 'POST',
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json',
        'User-Agent': HEADERS['User-Agent'],
      },
      body: JSON.stringify({
        client_id: GITHUB_CLIENT_ID,
        device_code: deviceCode,
        grant_type: 'urn:ietf:params:oauth:grant-type:device_code',
      }),
    });

    if (!response.ok) {
      throw new Error(`Failed to poll for access token: ${response.status}`);
    }

    const data = await response.json();
    const errorResult = OAuthErrorSchema.safeParse(data);

    if (errorResult.success && errorResult.data.error) {
      logger.debug({ error: errorResult.data.error }, 'Token polling returned error');

      return errorResult.data;
    }

    const tokenResult = OAuthTokenResponseSchema.safeParse(data);

    if (tokenResult.success) {
      logger.info('Access token obtained');

      return tokenResult.data;
    }

    throw new Error('Unexpected response from GitHub');
  }

  async getCopilotToken(accessToken: string): Promise<CopilotTokenResponse> {
    logger.debug('Requesting Copilot token');

    const apiDomain = this.domain === 'github.com' ? 'api.github.com' : `api.${this.domain}`;
    const response = await fetch(`https://${apiDomain}/copilot_internal/v2/token`, {
      method: 'GET',
      headers: {
        Accept: 'application/json',
        Authorization: `Bearer ${accessToken}`,
        ...HEADERS,
      },
    });

    if (!response.ok) {
      if (response.status === 401) {
        throw new Error('Invalid or expired access token');
      }
      if (response.status === 403) {
        throw new Error('Access denied - user may not have Copilot access');
      }
      throw new Error(`Failed to get Copilot token: ${response.status}`);
    }

    const result = CopilotTokenResponseSchema.safeParse(await response.json());

    if (!result.success) {
      throw new Error('Invalid response from Copilot API');
    }

    logger.info({ expires_at: result.data.expires_at }, 'Copilot token obtained');

    return result.data;
  }

  getBaseUrl(): string {
    return this.domain === 'github.com'
      ? 'https://api.githubcopilot.com'
      : `https://copilot-api.${this.domain}`;
  }
}

let defaultClient: CopilotAuthClient | null = null;

export function getCopilotAuthClient(options?: { enterpriseUrl?: string }): CopilotAuthClient {
  if (options?.enterpriseUrl) {
    return new CopilotAuthClient(options.enterpriseUrl);
  }

  defaultClient ??= new CopilotAuthClient();

  return defaultClient;
}
