import type { LanguageModelV3Middleware } from '@ai-sdk/provider';
import type { CopilotTokenStorage } from './token-storage';

export function createCopilotTokenMiddleware(
  tokenStorage: CopilotTokenStorage,
): LanguageModelV3Middleware {
  return {
    specificationVersion: 'v3',

    transformParams: async ({ params }) => {
      const credentials = await tokenStorage.get();

      if (!credentials) {
        throw new Error('No Copilot credentials available. Please login first.');
      }

      return {
        ...params,
        headers: {
          ...params.headers,
          Authorization: `Bearer ${credentials.apiKey}`,
        },
      };
    },
  };
}
