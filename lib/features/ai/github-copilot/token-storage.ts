import { createLogger } from '@/lib/utils/logger';
import { getCopilotAuthClient } from './client';
import { getDBConfig, setDBConfig, type CopilotConfig } from '@/lib/features/config';

const logger = createLogger('copilot-token');

const REFRESH_BUFFER_SECONDS = 300;

export interface CopilotCredentials {
  apiKey: string;
  baseURL: string;
}

export class CopilotTokenStorage {
  private configCache: CopilotConfig | null = null;

  async set(refreshToken: string, metadata: Record<string, unknown>): Promise<void> {
    const config = await this.getConfig();
    const updated: Partial<CopilotConfig> = {
      refreshToken,
      accessToken: undefined,
      accessTokenExpiresAt: undefined,
      baseUrl: metadata.baseUrl as string || config?.baseUrl || 'https://api.githubcopilot.com',
      enterpriseUrl: metadata.enterpriseUrl as string | undefined,
    };

    await this.updateConfig(updated);
    logger.info('Stored refresh token');
  }

  async get(): Promise<CopilotCredentials | null> {
    const config = await this.getConfig();

    if (!config?.refreshToken) {
      return null;
    }

    const needsRefresh = !config.accessToken
      || !config.accessTokenExpiresAt
      || Date.now() >= config.accessTokenExpiresAt - (REFRESH_BUFFER_SECONDS * 1000);

    if (needsRefresh) {
      const refreshed = await this.refresh(config);

      if (!refreshed) {
        return null;
      }

      return { apiKey: refreshed.accessToken, baseURL: refreshed.baseUrl };
    }

    if (!config.accessToken) {
      return null;
    }

    return { apiKey: config.accessToken, baseURL: config.baseUrl };
  }

  private async getConfig(): Promise<CopilotConfig | null> {
    if (this.configCache) {
      return this.configCache;
    }

    const dbConfig = await getDBConfig();
    this.configCache = dbConfig.copilot;
    return this.configCache;
  }

  private async refresh(config: CopilotConfig): Promise<{ accessToken: string; baseUrl: string } | null> {
    try {
      const client = getCopilotAuthClient({
        enterpriseUrl: config.enterpriseUrl,
      });
      const { token: accessToken, expires_at } = await client.getCopilotToken(config.refreshToken);

      const updated: Partial<CopilotConfig> = {
        accessToken,
        accessTokenExpiresAt: expires_at * 1000,
      };

      await this.updateConfig(updated);

      this.configCache = null;

      logger.info({ expiresInMinutes: Math.floor(((expires_at * 1000) - Date.now()) / 60000) }, 'Token refreshed');

      return { accessToken, baseUrl: config.baseUrl };
    } catch (error) {
      logger.error({ error }, 'Failed to refresh token');

      return null;
    }
  }

  private async updateConfig(updates: Partial<CopilotConfig>): Promise<void> {
    const current = await this.getConfig();
    const merged: CopilotConfig = {
      refreshToken: updates.refreshToken ?? current?.refreshToken ?? '',
      accessToken: updates.accessToken,
      accessTokenExpiresAt: updates.accessTokenExpiresAt,
      baseUrl: updates.baseUrl ?? current?.baseUrl ?? 'https://api.githubcopilot.com',
      enterpriseUrl: updates.enterpriseUrl ?? current?.enterpriseUrl,
    };

    await setDBConfig({ copilot: merged });
    this.configCache = merged;
  }
}
