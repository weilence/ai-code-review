import { createOpenAICompatible } from '@ai-sdk/openai-compatible';
import type { AIProviderConfig } from '../../config/schema';
import { AIProviderError } from '../../utils/errors';
import { wrapLanguageModel, type LanguageModel } from 'ai';
import { devToolsMiddleware } from '@ai-sdk/devtools';

export function createOpenAICompatibleModel(config: AIProviderConfig): LanguageModel {
  if (!config.baseUrl) {
    throw new AIProviderError(
      'baseUrl is required for openai-compatible provider',
      'openai-compatible',
    );
  }

  const openAICompatible = createOpenAICompatible({
    baseURL: config.baseUrl,
    apiKey: config.apiKey,
    name: 'opencode',
    supportsStructuredOutputs: true,
  });

  return wrapLanguageModel({
    model: openAICompatible(config.model),
    middleware: devToolsMiddleware(),
  });
}
