import { generateText, Output, type SystemModelMessage } from 'ai';
import type { z } from 'zod';
import type { RegisteredProvider } from './registry';
import { createLogger } from '../utils/logger';
import type { JSONObject } from '@ai-sdk/provider';

const logger = createLogger('ai-generate');

const LANGUAGE_MAP: Record<'zh' | 'en', string> = {
  zh: '中文',
  en: 'English',
};

export interface GenerateOptions<T> {
  schema: z.ZodType<T>;
  prompt: string;
  system?: string;
  temperature?: number;
  maxTokens?: number;
  language?: 'zh' | 'en';
}

export async function generate<T>(
  provider: RegisteredProvider,
  options: GenerateOptions<T>,
): Promise<T> {
  logger.debug(
    { provider: provider.name, model: provider.config.model },
    'Generating with provider',
  );

  try {
    const systemMessage: SystemModelMessage[] = [{
      role: 'system',
      content: options.system ?? 'You are a helpful coding assistant that provides code analysis based on user prompts.',
    }];

    const providerOptions: Record<string, JSONObject> = {};

    if (provider.config.model === 'glm-4.7-free') {
      providerOptions.opencode = {
        response_format: {
          type: 'json_object',
        },
      };

      const schema = options.schema.toJSONSchema();

      delete schema.$schema;
      delete schema.additionalProperties;

      systemMessage.push({
        role: 'system',
        content: `Respond in the following JSON Schema format:\n${JSON.stringify(schema)}`,
      });
    }

    if (options.language) {
      systemMessage.push({
        role: 'system',
        content: `Respond in ${LANGUAGE_MAP[options.language]}`,
      });
    }

    const { output } = await generateText({
      model: provider.model,
      prompt: options.prompt,
      system: systemMessage,
      output: Output.object({ schema: options.schema }),
      providerOptions: providerOptions,
    });

    logger.info(
      { provider: provider.name, model: provider.config.model },
      'Successfully generated with provider',
    );

    return output;
  } catch (error) {
    logger.error(
      { provider: provider.name, error: error },
      'Provider generation failed',
    );
    throw error;
  }
}
