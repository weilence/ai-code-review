import type { PushWebhook } from '../types';
import type { WebhookEventsConfig } from '../../config/schema';
import { createLogger } from '../../utils/logger';

const logger = createLogger('push-handler');

export interface PushHandlerOptions {
  webhook: PushWebhook;
  config: WebhookEventsConfig;
}

export interface PushHandlerResult {
  handled: boolean;
  skipped: boolean;
  skipReason?: string;
  branchReviewed?: string;
  commitsCount?: number;
}

/**
 * Handle push webhook events
 * Note: Push events are currently informational and don't trigger reviews by default.
 * Full review is typically done on the MR level. This handler can be extended
 * to support commit-level reviews if needed.
 */
export function handlePushEvent(
  options: PushHandlerOptions,
): PushHandlerResult {
  const { webhook, config } = options;
  const { project, ref, commits, total_commits_count } = webhook;

  // Extract branch name from ref (refs/heads/branch-name)
  const branch = ref.replace('refs/heads/', '');

  logger.info(
    {
      projectId: project.id,
      branch,
      commitsCount: total_commits_count,
      pusher: webhook.user_username,
    },
    'Processing push webhook',
  );

  // Check if push events are enabled
  if (!config.push.enabled) {
    logger.debug('Push events disabled');

    return { handled: false, skipped: true, skipReason: 'Push events disabled' };
  }

  // Check if branch is in the allowed list (if specified)
  if (config.push.branches.length > 0) {
    const branchMatches = config.push.branches.some((pattern) => {
      if (pattern.includes('*')) {
        // Simple wildcard matching
        const regex = new RegExp(
          '^' + pattern.replace(/\*/g, '.*') + '$',
        );

        return regex.test(branch);
      }

      return pattern === branch;
    });

    if (!branchMatches) {
      logger.debug(
        { branch, allowedBranches: config.push.branches },
        'Branch not in allowed list',
      );

      return { handled: false, skipped: true, skipReason: `Branch '${branch}' not in allowed list` };
    }
  }

  // Skip empty pushes (branch deletions)
  if (webhook.after === '0000000000000000000000000000000000000000') {
    logger.debug({ branch }, 'Branch deleted, skipping');

    return { handled: false, skipped: true, skipReason: 'Branch deletion' };
  }

  // Skip if no commits
  if (commits.length === 0) {
    logger.debug({ branch }, 'No commits in push');

    return { handled: false, skipped: true, skipReason: 'No commits' };
  }

  // Log push information
  logger.info(
    {
      projectId: project.id,
      branch,
      commitsCount: commits.length,
      commits: commits.map(c => ({
        id: c.id.substring(0, 8),
        title: c.title,
        author: c.author.name,
      })),
    },
    'Push event processed',
  );

  // For now, push events are logged but don't trigger automatic reviews.
  // Reviews are typically done at the MR level where we have full context.
  // This can be extended to support commit-level reviews if needed.

  return {
    handled: true,
    skipped: false,
    branchReviewed: branch,
    commitsCount: commits.length,
  };
}
