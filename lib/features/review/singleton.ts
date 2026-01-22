import { getConfig } from '@/lib/features/config';
import { GitLabClient } from '@/lib/features/gitlab/client';
import { AICodeReviewRegistry } from '@/lib/features/ai';
import { CopilotTokenStorage } from '@/lib/features/ai/github-copilot';
import { ReviewEngine } from '@/lib/features/review';
import { DEFAULT_AI_MODEL } from '@/lib/constants';
import { getCopilotTokenPath } from '@/lib/db/path';

/**
 * ReviewEngine Singleton
 *
 * Manages a single instance of ReviewEngine for the application lifetime.
 * This is important for Next.js where multiple instances might be created.
 */
let reviewEngineInstance: ReviewEngine | null = null;

/**
 * Get or create the ReviewEngine singleton
 */
export async function getReviewEngine(): Promise<ReviewEngine> {
  if (!reviewEngineInstance) {
    const config = await getConfig();

    // Create GitHub Copilot token storage
    const copilotTokenStorage = new CopilotTokenStorage(getCopilotTokenPath());

    // Create AI registry
    const aiRegistry = new AICodeReviewRegistry(config.ai, copilotTokenStorage);

    // Create GitLab client
    const gitlabClient = new GitLabClient(config.gitlab);

    // Get the first model or use default
    const firstModelId = Object.keys(config.ai.models)[0];
    const modelId = (firstModelId as `anthropic:${string}` | `openai:${string}` | `github-copilot:${string}` | `openai-compatible:${string}`) || DEFAULT_AI_MODEL as `anthropic:${string}` | `openai:${string}` | `github-copilot:${string}` | `openai-compatible:${string}`;

    // Create review engine
    reviewEngineInstance = new ReviewEngine(
      aiRegistry,
      modelId,
      gitlabClient,
      config.review,
    );
  }

  return reviewEngineInstance;
}

/**
 * Reset the ReviewEngine singleton (mainly for testing)
 */
export function resetReviewEngine(): void {
  reviewEngineInstance = null;
}
