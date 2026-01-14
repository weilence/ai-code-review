import { wrapLanguageModel } from 'ai';
import { createGitHubCopilotOpenAICompatible, type GitHubCopilotProviderSettings } from '@opeoginni/github-copilot-openai-compatible';
import type { CopilotTokenStorage } from './token-storage';
import { createCopilotTokenMiddleware } from './middleware';
import type { EmbeddingModelV3, ImageModelV3, LanguageModelV3, ProviderV3 } from '@ai-sdk/provider';

export function createGitHubCopilot(
  options: GitHubCopilotProviderSettings,
  tokenStorage: CopilotTokenStorage,
): ProviderV3 {
  const githubCopilot = createGitHubCopilotOpenAICompatible(options);

  return {
    specificationVersion: 'v3',
    embeddingModel: function (_: string): EmbeddingModelV3 {
      throw new Error('Function not implemented.');
    },
    imageModel: function (_: string): ImageModelV3 {
      throw new Error('Function not implemented.');
    },
    languageModel: function (modelId: string): LanguageModelV3 {
      return wrapLanguageModel(
        {
          model: githubCopilot.languageModel(modelId),
          middleware: [createCopilotTokenMiddleware(tokenStorage)],
        },
      );
    },
  } satisfies ProviderV3;
}

export * from './types';
export * from './client';
export * from './token-storage';
export * from './auth-handler';
