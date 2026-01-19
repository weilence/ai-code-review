import { getConfig } from '@/lib/features/config';
import { GitLabClient } from '@/lib/features/gitlab';
import { ReviewEngine } from '@/lib/features/review';
import { AICodeReviewRegistry } from '@/lib/features/ai';
import { CopilotTokenStorage } from '@/lib/features/ai/github-copilot';

/**
 * 获取 ReviewEngine 单例
 */
let reviewEngine: ReviewEngine | null = null;

export async function getReviewEngine(): Promise<ReviewEngine> {
  if (!reviewEngine) {
    const config = await getConfig();

    // 创建 GitHub Copilot token storage
    const copilotTokenStorage = new CopilotTokenStorage(
      process.env.COPILON_TOKEN_PATH || './data/copilot-token.json',
    );

    // 创建 AI registry
    const aiRegistry = new AICodeReviewRegistry(config.ai, copilotTokenStorage);

    // 创建 GitLab 客户端
    const gitlabClient = new GitLabClient(config.gitlab);

    // 创建 review engine
    const modelId = config.ai.models[0] as 'anthropic:claude-sonnet-4-5';
    reviewEngine = new ReviewEngine(
      aiRegistry,
      modelId,
      gitlabClient,
      config.review,
    );
  }

  return reviewEngine;
}

/**
 * 获取 GitLab 客户端单例
 */
let gitlabClient: GitLabClient | null = null;

export async function getGitLabClient(): Promise<GitLabClient> {
  if (!gitlabClient) {
    const config = await getConfig();
    gitlabClient = new GitLabClient(config.gitlab);
  }

  return gitlabClient;
}
