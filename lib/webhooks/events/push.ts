import type { WebhookEventsConfig } from '@/lib/features/config';
import { createLogger } from '@/lib/utils/logger';
import type { PushWebhook } from '../types';

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
 * Currently not implemented - push events are not supported
 */
export function handlePushEvent(
  options: PushHandlerOptions,
): PushHandlerResult {
  const { webhook, config } = options;

  logger.info(
    {
      projectId: webhook.project.id,
      ref: webhook.ref,
      commitsCount: webhook.total_commits_count,
    },
    'Processing push webhook',
  );

  // Check if push events are enabled
  if (!config.push.enabled) {
    logger.debug('Push events disabled');

    return { handled: false, skipped: true, skipReason: 'Push events disabled' };
  }

  // Extract branch name from ref
  const branchName = webhook.ref.replace('refs/heads/', '');

  // Check if this branch should be reviewed
  const shouldReview = config.push.branches.includes(branchName);

  if (!shouldReview) {
    logger.debug(
      { branchName, configuredBranches: config.push.branches },
      'Branch not in configured list',
    );

    return { handled: false, skipped: true, skipReason: 'Branch not configured' };
  }

  // Push events are currently not supported
  logger.info({ branchName }, 'Push review not implemented');

  return {
    handled: false,
    skipped: true,
    skipReason: 'Push review not implemented',
    branchReviewed: branchName,
    commitsCount: webhook.total_commits_count,
  };
}
