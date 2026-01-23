import type { WebhookEventsConfig } from '@/lib/features/config';
import { getQueueManager } from '@/lib/features/queue';
import { createLogger } from '@/lib/utils/logger';
import type { MergeRequestWebhook } from '../types';

const logger = createLogger('mr-handler');

export interface MergeRequestHandlerOptions {
  webhook: MergeRequestWebhook;
  config: WebhookEventsConfig;
  webhookEventId?: number;
}

export interface MergeRequestHandlerResult {
  handled: boolean;
  skipped: boolean;
  skipReason?: string;
}

/**
 * Handle merge request webhook events
 */
export async function handleMergeRequestEvent(
  options: MergeRequestHandlerOptions,
): Promise<MergeRequestHandlerResult> {
  const { webhook, config } = options;
  const { object_attributes: mr, project } = webhook;

  logger.info(
    {
      projectId: project.id,
      mrIid: mr.iid,
      action: mr.action,
      title: mr.title,
      author: webhook.user.username,
    },
    'Processing merge request webhook',
  );

  // Check if MR events are enabled
  if (!config.mr.enabled) {
    logger.debug('Merge request events disabled');

    return { handled: false, skipped: true, skipReason: 'MR events disabled' };
  }

  // Check if this action is in the enabled events list
  const action = mr.action;

  if (!config.mr.events.includes(action)) {
    logger.debug(
      { action, enabledEvents: config.mr.events },
      'Action not in enabled events list',
    );

    return { handled: false, skipped: true, skipReason: `Action '${action}' not enabled` };
  }

  // Skip draft/WIP merge requests if configured
  if ((mr.work_in_progress || mr.draft) && !config.mr.reviewDrafts) {
    logger.info({ mrIid: mr.iid }, 'Skipping draft merge request');

    return { handled: false, skipped: true, skipReason: 'Draft MR' };
  }

  // Skip closed/merged MRs
  if (mr.state !== 'opened') {
    logger.debug({ mrIid: mr.iid, state: mr.state }, 'Skipping non-open MR');

    return { handled: false, skipped: true, skipReason: `MR state: ${mr.state}` };
  }

  // Enqueue review task
  try {
    const queueManager = await getQueueManager();
    await queueManager.enqueue({
      projectId: project.id,
      mrIid: mr.iid,
      projectPath: project.path_with_namespace,
      mrTitle: mr.title,
      mrAuthor: webhook.user.username,
      mrDescription: mr.description,
      sourceBranch: mr.source_branch,
      targetBranch: mr.target_branch,
      triggeredBy: 'webhook',
      triggerEvent: mr.action,
      webhookEventId: options.webhookEventId,
      priority: 5, // Default priority for webhook triggers
    });

    return { handled: true, skipped: false };
  } catch (error) {
    logger.error({ error, projectId: project.id, mrIid: mr.iid }, 'Failed to enqueue review task');

    return { handled: false, skipped: true, skipReason: 'Failed to enqueue task' };
  }
}
