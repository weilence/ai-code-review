import { config } from './config';
import { AIProviderRegistry } from './ai/registry';
import { GitLabClient } from './gitlab/client';
import { ReviewEngine } from './review/engine';
import { CopilotTokenStorage } from './ai/providers/github-copilot';
import { createLogger } from './utils/logger';

const logger = createLogger('bootstrap');

if (config.log.level === 'debug') {
  logger.info(config, 'Loaded configuration:');
}

export const copilotTokenStorage = new CopilotTokenStorage('./data/copilot-token.json');

export const aiRegistry = new AIProviderRegistry(config.ai, {
  copilotTokenStorage,
});

export const gitlabClient = new GitLabClient(config.gitlab);

export const reviewEngine = new ReviewEngine(
  gitlabClient,
  aiRegistry,
  config.review,
);
