import type { MergeRequestWebhook } from '../types';
import type { ReviewEngine } from '../../review/engine';
import type { WebhookEventsConfig } from '../../config/schema';
import { createLogger } from '../../utils/logger';

const logger = createLogger('mr-handler');

export interface MergeRequestHandlerOptions {
  webhook: MergeRequestWebhook;
  reviewEngine: ReviewEngine;
  config: WebhookEventsConfig;
}

export interface MergeRequestHandlerResult {
  handled: boolean;
  skipped: boolean;
  skipReason?: string;
}

/**
 * Handle merge request webhook events
 */
export function handleMergeRequestEvent(
  options: MergeRequestHandlerOptions,
): MergeRequestHandlerResult {
  const { webhook, reviewEngine, config } = options;
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

  reviewEngine.reviewMergeRequest({
    projectId: project.id,
    mrIid: mr.iid,
  }).then((result) => {
    logger.info(
      {
        projectId: project.id,
        mrIid: mr.iid,
        inlineCommentsPosted: result.inlineCommentsPosted,
        summaryPosted: result.summaryPosted,
        providerUsed: result.analysis.providerUsed,
        durationMs: result.analysis.durationMs,
      },
      'Merge request review completed',
    );
  }).catch((error: unknown) => {
    logger.error(
      { error, projectId: project.id, mrIid: mr.iid },
      'Failed to review merge request',
    );
  });

  return {
    handled: true,
    skipped: false,
  };
}
