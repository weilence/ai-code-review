import { wrapLanguageModel } from 'ai';
import { createGitHubCopilotOpenAICompatible } from '@opeoginni/github-copilot-openai-compatible';
import type { LanguageModel } from 'ai';
import type { AIProviderConfig } from '../../../config/schema';
import type { CopilotTokenStorage } from './token-storage';
import { createCopilotTokenMiddleware } from './middleware';
import { HEADERS } from './client';

export function createGitHubCopilotModel(
  config: AIProviderConfig,
  tokenStorage: CopilotTokenStorage,
): LanguageModel {
  const gihubCopilot = createGitHubCopilotOpenAICompatible({
    apiKey: config.apiKey ?? 'placeholder',
    baseURL: config.baseUrl,
    headers: HEADERS,
  });

  return wrapLanguageModel({
    model: gihubCopilot(config.model),
    middleware: createCopilotTokenMiddleware(tokenStorage),
  });
}

export * from './types';
export * from './client';
export * from './token-storage';
export * from './auth-handler';
