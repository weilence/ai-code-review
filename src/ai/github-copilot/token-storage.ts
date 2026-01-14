import { createLogger } from '../../utils/logger';
import { getCopilotAuthClient } from './client';

const logger = createLogger('copilot-token');

interface StoredToken {
  refreshToken: string;
  accessToken: string | null;
  accessTokenExpiresAt: number | null;
  metadata: Record<string, unknown>;
}

export interface CopilotCredentials {
  apiKey: string;
  baseURL: string;
}

export class CopilotTokenStorage {
  private readonly filePath: string;
  private readonly refreshBufferMs: number;

  constructor(filePath: string, refreshBufferSeconds = 300) {
    this.filePath = filePath;
    this.refreshBufferMs = refreshBufferSeconds * 1000;
  }

  async set(refreshToken: string, metadata: Record<string, unknown>): Promise<void> {
    const token: StoredToken = {
      refreshToken,
      accessToken: null,
      accessTokenExpiresAt: null,
      metadata,
    };

    await this.save(token);
    logger.info('Stored refresh token');
  }

  async get(): Promise<CopilotCredentials | null> {
    let token = await this.load();

    if (!token) {
      return null;
    }

    const needsRefresh = !token.accessToken
      || !token.accessTokenExpiresAt
      || Date.now() >= token.accessTokenExpiresAt - this.refreshBufferMs;

    if (needsRefresh) {
      const refreshed = await this.refresh(token);

      if (!refreshed) {
        return null;
      }

      token = refreshed;
    }

    if (!token.accessToken) {
      return null;
    }

    return { apiKey: token.accessToken, baseURL: token.metadata.baseUrl as string };
  }

  private async load(): Promise<StoredToken | null> {
    try {
      const file = Bun.file(this.filePath);

      if (await file.exists()) {
        const content = await file.text();

        if (content && content !== 'null') {
          return JSON.parse(content) as StoredToken;
        }
      }
    } catch (error) {
      logger.error({ error }, 'Failed to load token');
    }

    return null;
  }

  private async refresh(token: StoredToken): Promise<StoredToken | null> {
    try {
      const client = getCopilotAuthClient({
        enterpriseUrl: token.metadata.enterpriseUrl as string | undefined,
      });
      const { token: accessToken, expires_at } = await client.getCopilotToken(token.refreshToken);

      const refreshed: StoredToken = {
        ...token,
        accessToken,
        accessTokenExpiresAt: (expires_at * 1000),
      };

      await this.save(refreshed);
      logger.info({ expiresInMinutes: Math.floor(((expires_at * 1000) - Date.now()) / 60000) }, 'Token refreshed');

      return refreshed;
    } catch (error) {
      logger.error({ error }, 'Failed to refresh token');

      return null;
    }
  }

  private async save(token: StoredToken): Promise<void> {
    const dir = this.filePath.substring(0, this.filePath.lastIndexOf('/'));

    await Bun.write(dir + '/.keep', '');
    await Bun.write(this.filePath, JSON.stringify(token, null, 2));
  }
}
