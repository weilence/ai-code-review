import type { LanguageModel } from 'ai';
import type { AIProviderType, AIConfig, AIProviderConfig } from '../config/schema';
import type { CopilotTokenStorage } from './providers/github-copilot';
import { createOpenAIModel } from './providers/openai';
import { createAnthropicModel } from './providers/anthropic';
import { createGitHubCopilotModel } from './providers/github-copilot';
import { createOpenAICompatibleModel } from './providers/openai-compatible';
import { createLogger } from '../utils/logger';
import { AIProviderError } from '../utils/errors';
import type { RegisteredProvider } from './types';

const logger = createLogger('ai-registry');

export interface AIProviderRegistryOptions {
  copilotTokenStorage?: CopilotTokenStorage;
}

export class AIProviderRegistry {
  private providers = new Map<string, RegisteredProvider>();
  private activeProviderName: string;

  constructor(
    config: AIConfig,
    private options: AIProviderRegistryOptions = {},
  ) {
    const [firstProvider] = config.providers;

    if (!firstProvider) {
      throw new AIProviderError('No AI providers configured', 'none');
    }

    for (const providerName of config.providers) {
      const providerType = providerName as AIProviderType;
      const providerConfig = config[providerType];

      if (!providerConfig) {
        throw new AIProviderError(`Provider "${providerName}" listed but not configured`, providerName);
      }

      this.registerProvider(providerName, providerConfig);
    }

    this.activeProviderName = firstProvider;
    logger.info({ provider: this.activeProviderName }, 'Set active provider');
  }

  private registerProvider(name: string, config: AIProviderConfig): void {
    const model = this.createModel(name, config);

    this.providers.set(name, {
      name,
      config,
      model,
    });

    logger.info({ provider: name, model: config.model }, 'Registered AI provider');
  }

  private createModel(name: string, config: AIProviderConfig): LanguageModel {
    switch (name) {
      case 'openai':
        return createOpenAIModel(config);

      case 'anthropic':
        return createAnthropicModel(config);

      case 'github-copilot': {
        if (!this.options.copilotTokenStorage) {
          throw new AIProviderError(
            'copilotTokenStorage is required for github-copilot provider',
            name,
          );
        }

        return createGitHubCopilotModel(config, this.options.copilotTokenStorage);
      }

      case 'openai-compatible':
        return createOpenAICompatibleModel(config);

      default: {
        throw new AIProviderError(`Unsupported provider type: ${name}`, name);
      }
    }
  }

  getActiveProvider(): RegisteredProvider {
    const provider = this.providers.get(this.activeProviderName);

    if (!provider) {
      throw new AIProviderError(`Active provider "${this.activeProviderName}" not found`, this.activeProviderName);
    }

    return provider;
  }

  getAllProviders(): RegisteredProvider[] {
    return Array.from(this.providers.values());
  }
}

export type { RegisteredProvider };
