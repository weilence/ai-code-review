import { config } from './config';
import { GitLabClient } from './gitlab/client';
import { ReviewEngine } from './review/engine';
import { CopilotTokenStorage } from './ai/github-copilot';
import { createLogger } from './utils/logger';
import { AICodeReviewRegistry } from './ai/registry';

const logger = createLogger('bootstrap');

if (config.log.level === 'debug') {
  logger.info(config, 'Loaded configuration:');
}

export const copilotTokenStorage = new CopilotTokenStorage('./data/copilot-token.json');

export const aiRegistry = new AICodeReviewRegistry(config.ai);

export const gitlabClient = new GitLabClient(config.gitlab);

export const reviewEngine = new ReviewEngine(
  aiRegistry,
  // 'anthropic:minimax-m2.1-free',
  'openai-compatible:glm-4.7-free',
  gitlabClient,
  config.review,
);
