import { createProviderRegistry, wrapLanguageModel } from 'ai';
import type { AIConfig } from '../config/schema';
import { createLogger } from '../utils/logger';
import { createOpenAI } from '@ai-sdk/openai';
import { createAnthropic } from '@ai-sdk/anthropic';
import { createOpenAICompatible } from '@ai-sdk/openai-compatible';
import type { EmbeddingModelV3, ImageModelV3, LanguageModelV3, RerankingModelV3, SpeechModelV3, TranscriptionModelV3 } from '@ai-sdk/provider';
import { devToolsMiddleware } from '@ai-sdk/devtools';
import { type CopilotTokenStorage, createGitHubCopilot as createGitHubCopilot, HEADERS } from './github-copilot';

const logger = createLogger('ai-registry');

function createRegistry(config: AIConfig, copilotTokenStorage: CopilotTokenStorage) {
  logger.info('Creating AI provider registry');

  return createProviderRegistry({
    'openai': createOpenAI({
      apiKey: config.openai?.apiKey,
      baseURL: config.openai?.baseUrl,
    }),
    'anthropic': createAnthropic({
      apiKey: config.anthropic?.apiKey,
      baseURL: config.anthropic?.baseUrl,
    }),
    'openai-compatible': createOpenAICompatible({
      apiKey: config['openai-compatible']?.apiKey,
      baseURL: config['openai-compatible']?.baseUrl ?? '',
      name: config.provider ?? 'openai-compatible',
      supportsStructuredOutputs: true,
    }),
    'github-copilot': createGitHubCopilot(
      {
        ...config['github-copilot'],
        headers: HEADERS,
      },
      copilotTokenStorage),
  });
}

export class AICodeReviewRegistry implements Registry {
  private registry: ReturnType<typeof createRegistry>;

  constructor(config: AIConfig, copilotTokenStorage: CopilotTokenStorage) {
    this.registry = createRegistry(config, copilotTokenStorage);
  }

  languageModel(id: LanguageModelId): LanguageModelV3 {
    const model = this.registry.languageModel(id) as LanguageModelV3 & { supportsStructuredOutputs?: boolean };

    return wrapLanguageModel({
      model,
      middleware: [
        {
          specificationVersion: 'v3',
          transformParams: ({ params }) => {
            if (model.supportsStructuredOutputs && params.responseFormat?.type === 'json') {
              if (params.responseFormat.schema) {
                const schema = params.responseFormat.schema;

                delete schema.$schema;
                delete schema.additionalProperties;

                let userIndex = params.prompt.findIndex(p => p.role === 'user');

                if (userIndex === -1) {
                  userIndex = params.prompt.length;
                }

                params.prompt.splice(userIndex, 0, {
                  role: 'system',
                  content: `Respond in the following JSON Schema format:\n${JSON.stringify(schema)}`,
                });

                delete params.responseFormat.schema;
              }
            }

            const provider = id.split(':')[0];

            if (provider && model.modelId.startsWith('glm-4.7')) {
              params.providerOptions = {
                [provider]: {
                  thinking: {
                    type: 'disabled',
                  },
                },
              };
            }

            return Promise.resolve(params);
          },
        },
        devToolsMiddleware(),
      ],
    });
  }

  embeddingModel(id: EmbeddingModelId): EmbeddingModelV3 {
    return this.registry.embeddingModel(id);
  }

  imageModel(id: ImageModelId): ImageModelV3 {
    return this.registry.imageModel(id);
  }

  transcriptionModel(id: TranscriptionModelId): TranscriptionModelV3 {
    return this.registry.transcriptionModel(id);
  }

  speechModel(id: SpeechModelId): SpeechModelV3 {
    return this.registry.speechModel(id);
  }

  rerankingModel(id: RerankingModelId): RerankingModelV3 {
    return this.registry.rerankingModel(id);
  }
}

export type Registry = ReturnType<typeof createRegistry>;
export type LanguageModelId = Registry extends { languageModel: (id: infer L) => LanguageModelV3 } ? L : never;
export type EmbeddingModelId = Registry extends { embeddingModel: (id: infer E) => EmbeddingModelV3 } ? E : never;
export type ImageModelId = Registry extends { imageModel: (id: infer I) => ImageModelV3 } ? I : never;
export type TranscriptionModelId = Registry extends { transcriptionModel: (id: infer T) => TranscriptionModelV3 } ? T : never;
export type SpeechModelId = Registry extends { speechModel: (id: infer S) => SpeechModelV3 } ? S : never;
export type RerankingModelId = Registry extends { rerankingModel: (id: infer R) => RerankingModelV3 } ? R : never;
