import type { GitLabClient } from './client';

export async function getGitLabClient(): Promise<GitLabClient> {
  if (!globalThis.__GITLAB_CLIENT__) {
    throw new Error(
      'GitLabClient has not been initialized. Make sure the server is running.',
    );
  }

  return globalThis.__GITLAB_CLIENT__;
}

export function resetGitLabClient(): void {
  globalThis.__GITLAB_CLIENT__ = undefined;
}
