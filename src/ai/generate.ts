import { generateText, Output, APICallError } from 'ai';
import type { z } from 'zod';
import { createLogger } from '../utils/logger';
import type { LanguageModelV3 } from '@ai-sdk/provider';

const logger = createLogger('ai-generate');

export interface GenerateOptions<T> {
  schema: z.ZodType<T>;
  prompt: string;
  system: string;
  temperature?: number;
  maxTokens?: number;
}

export async function generate<T>(
  model: LanguageModelV3,
  options: GenerateOptions<T>,
): Promise<T> {
  logger.debug(
    { provider: model.provider, model: model.modelId },
    'Generating with provider',
  );

  try {
    const { output } = await generateText({
      model,
      prompt: options.prompt,
      system: options.system,
      output: Output.object({ schema: options.schema }),
    });

    logger.info(
      { provider: model.provider, model: model.modelId },
      'Successfully generated with provider',
    );

    return output;
  } catch (error) {
    if (APICallError.isInstance(error)) {
      logger.error(
        {
          provider: model.provider,
          statusCode: error.statusCode,
          responseBody: error.responseBody,
          url: error.url,
        },
        'API call failed',
      );
    } else {
      logger.error(
        { provider: model.provider, error },
        'Provider generation failed',
      );
    }
    throw error;
  }
}
