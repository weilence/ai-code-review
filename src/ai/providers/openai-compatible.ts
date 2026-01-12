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

  const provider = config.provider ?? 'openai-compatible';
  const openAICompatible = createOpenAICompatible({
    baseURL: config.baseUrl,
    apiKey: config.apiKey,
    name: provider,
    supportsStructuredOutputs: true,
  });

  return wrapLanguageModel({
    model: openAICompatible(config.model),
    middleware: [{
      specificationVersion: 'v3',
      transformParams: ({ params }) => {
        if (config.model.startsWith('glm-4.7-free')) {
          if (params.responseFormat?.type === 'json') {
            if (params.responseFormat.schema) {
              const schema = params.responseFormat.schema;

              delete schema.$schema;
              delete schema.additionalProperties;

              params.prompt.push({
                role: 'system',
                content: `Respond in the following JSON Schema format:\n${JSON.stringify(schema)}`,
              });

              delete params.responseFormat.schema;
            }

            params.providerOptions = {
              [provider]: {
                response_format: { type: 'json_object' },
              },
            };
          }
        }

        return Promise.resolve(params);
      },
    }, devToolsMiddleware()],
  });
}
