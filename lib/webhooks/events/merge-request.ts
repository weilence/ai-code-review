import type { WebhookEventsConfig } from '@/lib/features/config';
import { getDb, reviews } from '@/lib/db';
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

  try {
    const db = await getDb();
    const [review] = await db.insert(reviews).values({
      projectId: String(project.id),
      projectPath: project.path_with_namespace,
      mrIid: mr.iid,
      mrTitle: mr.title,
      mrAuthor: webhook.user.username,
      mrDescription: mr.description || null,
      sourceBranch: mr.source_branch,
      targetBranch: mr.target_branch,
      status: 'pending',
      triggeredBy: 'webhook',
      triggerEvent: mr.action,
      webhookEventId: options.webhookEventId || null,
      createdAt: new Date(),
      updatedAt: new Date(),
    }).returning();

    if (!review) {
      throw new Error('Failed to create review record');
    }

    logger.info({ reviewId: review.id, projectId: project.id, mrIid: mr.iid }, 'Review record created');

    return { handled: true, skipped: false };
  } catch (error) {
    logger.error({ error, projectId: project.id, mrIid: mr.iid }, 'Failed to create review record');

    return { handled: false, skipped: true, skipReason: 'Failed to create review record' };
  }
}
