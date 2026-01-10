import { createOpenAI } from '@ai-sdk/openai';
import type { LanguageModel } from 'ai';
import type { AIProviderConfig } from '../../config/schema';

export function createOpenAIModel(config: AIProviderConfig): LanguageModel {
  const openai = createOpenAI({
    apiKey: config.apiKey,
    baseURL: config.baseUrl,
  });

  return openai(config.model);
}
