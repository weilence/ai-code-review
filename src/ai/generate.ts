import { generateText, Output, APICallError } from 'ai';
import type { z } from 'zod';
import type { RegisteredProvider } from './registry';
import { createLogger } from '../utils/logger';

const logger = createLogger('ai-generate');

export interface GenerateOptions<T> {
  schema: z.ZodType<T>;
  prompt: string;
  system: string;
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
    const { output } = await generateText({
      model: provider.model,
      prompt: options.prompt,
      system: options.system,
      output: Output.object({ schema: options.schema }),
    });

    logger.info(
      { provider: provider.name, model: provider.config.model },
      'Successfully generated with provider',
    );

    return output;
  } catch (error) {
    if (APICallError.isInstance(error)) {
      logger.error(
        {
          provider: provider.name,
          statusCode: error.statusCode,
          responseBody: error.responseBody,
          url: error.url,
        },
        'API call failed',
      );
    } else {
      logger.error(
        { provider: provider.name, error },
        'Provider generation failed',
      );
    }
    throw error;
  }
}
