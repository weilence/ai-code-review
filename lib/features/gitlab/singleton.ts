import { getConfig } from '@/lib/features/config';
import { GitLabClient } from './client';

/**
 * GitLab Client Singleton
 *
 * Manages a single instance of GitLabClient for the application lifetime.
 */
let gitlabClientInstance: GitLabClient | null = null;

/**
 * Get or create the GitLabClient singleton
 */
export async function getGitLabClient(): Promise<GitLabClient> {
  if (!gitlabClientInstance) {
    const config = await getConfig();
    gitlabClientInstance = new GitLabClient(config.gitlab);
  }

  return gitlabClientInstance;
}

/**
 * Reset the GitLabClient singleton (mainly for testing)
 */
export function resetGitLabClient(): void {
  gitlabClientInstance = null;
}
