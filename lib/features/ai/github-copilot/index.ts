import type { EmbeddingModelV3, ImageModelV3, LanguageModelV3, ProviderV3 } from '@ai-sdk/provider';
import { createGitHubCopilotOpenAICompatible, type GitHubCopilotProviderSettings } from '@opeoginni/github-copilot-openai-compatible';
import { wrapLanguageModel } from 'ai';
import { createCopilotTokenMiddleware } from './middleware';
import type { CopilotTokenStorage } from './token-storage';

export function createGitHubCopilot(
  options: GitHubCopilotProviderSettings,
  tokenStorage: CopilotTokenStorage,
): ProviderV3 {
  const githubCopilot = createGitHubCopilotOpenAICompatible(options);

  return {
    specificationVersion: 'v3',
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    embeddingModel: function (_modelId: string): EmbeddingModelV3 {
      throw new Error('Function not implemented.');
    },
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    imageModel: function (_modelId: string): ImageModelV3 {
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
