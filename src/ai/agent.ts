import { ToolLoopAgent, Output, stepCountIs, APICallError, type SystemModelMessage } from 'ai';
import type { z } from 'zod';
import type { LanguageModelV3 } from '@ai-sdk/provider';
import { createLogger } from '../utils/logger';

const logger = createLogger('ai-agent');

export interface AgentOptions<T> {
  schema: z.ZodType<T>;
  prompt: string;
  system: SystemModelMessage[];
  temperature?: number;
  maxTokens?: number;
  maxSteps?: number;
}

export async function generateWithAgent<T>(
  model: LanguageModelV3,
  options: AgentOptions<T>,
): Promise<T> {
  const { schema, prompt, system, temperature, maxTokens, maxSteps = 10 } = options;

  logger.debug(
    { provider: model.provider, model: model.modelId, maxSteps },
    'Creating agent with provider',
  );

  try {
    const agent = new ToolLoopAgent({
      model,
      instructions: system,
      output: Output.object({ schema }),
      stopWhen: stepCountIs(maxSteps),
      temperature,
      maxOutputTokens: maxTokens,
    });

    const result = await agent.generate({
      prompt,
    });

    logger.info(
      { provider: model.provider, model: model.modelId },
      'Successfully generated with agent',
    );

    return result.output;
  } catch (error) {
    if (APICallError.isInstance(error)) {
      logger.error(
        {
          provider: model.provider,
          statusCode: error.statusCode,
          responseBody: error.responseBody,
          url: error.url,
        },
        'Agent API call failed',
      );
    } else {
      logger.error(
        { provider: model.provider, error },
        'Agent generation failed',
      );
    }
    throw error;
  }
}
