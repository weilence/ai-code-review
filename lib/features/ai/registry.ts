import { createAnthropic } from '@ai-sdk/anthropic';
import { createOpenAI } from '@ai-sdk/openai';
import type {
  EmbeddingModelV3,
  ImageModelV3,
  LanguageModelV3,
  RerankingModelV3,
  SpeechModelV3,
  TranscriptionModelV3,
} from '@ai-sdk/provider';
import { createProviderRegistry, wrapLanguageModel } from 'ai';
import type { AIConfig } from '@/lib/features/config';
import type { AIModelConfig } from '@/lib/features/config/schema';
import { createLogger } from '@/lib/utils/logger';
import { createGitHubCopilot, type CopilotTokenStorage } from './github-copilot';

const logger = createLogger('ai-registry');

/**
 * 从模型配置中提取指定 provider 的配置
 * 使用第一个匹配该 provider 的模型配置
 */
function getProviderConfig(
  models: Record<string, AIModelConfig>,
  providerName: string
): { apiKey?: string; baseUrl?: string } | undefined {
  for (const config of Object.values(models)) {
    if (config.provider === providerName) {
      return {
        apiKey: config.apiKey,
        baseUrl: config.baseUrl,
      };
    }
  }
  return undefined;
}

function createRegistry(config: AIConfig, copilotTokenStorage: CopilotTokenStorage) {
  logger.info('Creating AI provider registry');

  // 从新的模型配置中提取每个 provider 的配置
  const anthropicConfig = getProviderConfig(config.models, 'anthropic');
  const openaiConfig = getProviderConfig(config.models, 'openai');
  const openaiCompatibleConfig = getProviderConfig(config.models, 'openai-compatible');
  const githubCopilotConfig = getProviderConfig(config.models, 'github-copilot');

  return createProviderRegistry({
    'openai': createOpenAI({
      apiKey: openaiConfig?.apiKey,
      baseURL: openaiConfig?.baseUrl,
    }),
    'anthropic': createAnthropic({
      apiKey: anthropicConfig?.apiKey,
      baseURL: anthropicConfig?.baseUrl,
    }),
    'openai-compatible': createOpenAI({
      apiKey: openaiCompatibleConfig?.apiKey,
      baseURL: openaiCompatibleConfig?.baseUrl ?? '',
    }),
    'github-copilot': createGitHubCopilot(
      {
        apiKey: githubCopilotConfig?.apiKey,
        baseURL: githubCopilotConfig?.baseUrl,
        headers: {
          'User-Agent': 'GitHubCopilotChat/0.35.0',
          'Editor-Version': 'vscode/1.107.0',
          'Editor-Plugin-Version': 'copilot-chat/0.35.0',
          'Copilot-Integration-Id': 'vscode-chat',
        },
      },
      copilotTokenStorage,
    ),
  });
}

export class AICodeReviewRegistry implements Registry {
  private registry: ReturnType<typeof createRegistry>;

  constructor(config: AIConfig, copilotTokenStorage: CopilotTokenStorage) {
    this.registry = createRegistry(config, copilotTokenStorage);
  }

  languageModel(id: LanguageModelId): LanguageModelV3 {
    return this.registry.languageModel(id);
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
