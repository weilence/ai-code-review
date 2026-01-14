import { config } from './config';
import { GitLabClient } from './gitlab/client';
import { ReviewEngine } from './review/engine';
import { CopilotTokenStorage } from './ai/github-copilot';
import { createLogger } from './utils/logger';
import { AICodeReviewRegistry, type LanguageModelId } from './ai/registry';

const logger = createLogger('bootstrap');

if (config.log.level === 'debug') {
  logger.info(config, 'Loaded configuration:');
}

export const copilotTokenStorage = new CopilotTokenStorage('./data/copilot-token.json');

const model = config.ai.models[0] as LanguageModelId | undefined;

if (!model) {
  throw new Error('No AI providers configured. Please configure at least one AI provider in the configuration file.');
}

logger.info(`Using primary AI model: ${model}`);

export const aiRegistry = new AICodeReviewRegistry(config.ai, copilotTokenStorage);

export const gitlabClient = new GitLabClient(config.gitlab);

export const reviewEngine = new ReviewEngine(
  aiRegistry,
  model,
  gitlabClient,
  config.review,
);
