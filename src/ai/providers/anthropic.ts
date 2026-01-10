import { createAnthropic } from '@ai-sdk/anthropic';
import type { LanguageModel } from 'ai';
import type { AIProviderConfig } from '../../config/schema';

export function createAnthropicModel(config: AIProviderConfig): LanguageModel {
  const anthropic = createAnthropic({
    apiKey: config.apiKey,
    baseURL: config.baseUrl,
  });

  return anthropic(config.model);
}
