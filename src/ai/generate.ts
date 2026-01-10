import { generateText, Output } from 'ai';
import type { z } from 'zod';
import type { RegisteredProvider } from './registry';
import { createLogger } from '../utils/logger';
import type { JSONObject } from '@ai-sdk/provider';

const logger = createLogger('ai-generate');

export interface GenerateOptions<T> {
  schema: z.ZodType<T>;
  prompt: string;
  system?: string;
  temperature?: number;
  maxTokens?: number;
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
    let systemMessage = options.system ?? '';

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

      systemMessage += `\n\nPlease return the code analysis results in the following JSON Schema format:\n${JSON.stringify(schema)}\n`;
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
