import type { WebhookEventsConfig } from '@/lib/features/config';
import type { ReviewEngine } from '@/lib/features/review';
import { getDb, webhooks } from '@/lib/db';
import { createLogger } from '@/lib/utils/logger';
import { handleMergeRequestEvent } from './events/merge-request';
import { handleNoteEvent } from './events/note';
import { handlePushEvent } from './events/push';
import { verifyWebhookSignature, SUPPORTED_EVENT_TYPES } from './security';
import {
  type GitLabWebhook,
  isMergeRequestWebhook,
  isPushWebhook,
  isNoteWebhook,
  extractWebhookMeta,
} from './types';
import { GITLAB_OBJECT_KIND_MAP } from '@/lib/constants';

const logger = createLogger('webhook-handler');

export interface WebhookResponse {
  success: boolean;
  message: string;
  eventType?: string;
  handled?: boolean;
  details?: Record<string, unknown>;
}

/**
 * Create the main webhook handler
 */
export async function handleWebhook(deps: {
  webhookSecret: string;
  reviewEngine: ReviewEngine;
  eventsConfig: WebhookEventsConfig;
  request: Request;
}): Promise<WebhookResponse> {
  const requestId = crypto.randomUUID();

  try {
    // Get headers
    const token = deps.request.headers.get('X-Gitlab-Token');
    const eventType = deps.request.headers.get('X-Gitlab-Event');

    logger.info({ requestId, eventType }, 'Received webhook request');

    // Verify signature
    verifyWebhookSignature({
      secret: deps.webhookSecret,
      token,
      eventType: eventType || undefined,
    });

    // Parse body
    const body = await deps.request.json() as GitLabWebhook;

    // Map GitLab object_kind to database eventType
    const dbEventType = GITLAB_OBJECT_KIND_MAP[body.object_kind] || 'mr';

    // Log webhook to database
    const db = getDb();
    const webhookRecord = await db.insert(webhooks).values({
      eventType: dbEventType,
      objectKind: body.object_kind,
      payload: body as unknown as Record<string, unknown>,
      projectId: body.project.id.toString(),
      processed: false,
    }).returning();

    const webhookEventId = webhookRecord[0]?.id;

    // Validate event type
    if (!eventType || !SUPPORTED_EVENT_TYPES.includes(body.object_kind)) {
      logger.debug(
        { eventType, objectKind: body.object_kind },
        'Unsupported event type',
      );

      return {
        success: true,
        message: 'Event type not supported, skipping',
        eventType: body.object_kind,
        handled: false,
      };
    }

    // Extract metadata for logging
    const meta = extractWebhookMeta(body, requestId);

    logger.info(
      { requestId, ...meta },
      'Processing webhook',
    );

    // Route to appropriate handler
    let result: WebhookResponse;

    if (isMergeRequestWebhook(body)) {
      const handlerResult = await handleMergeRequestEvent({
        webhook: body,
        reviewEngine: deps.reviewEngine,
        config: deps.eventsConfig,
        webhookEventId,
      });

      result = {
        success: true,
        message: handlerResult.handled
          ? 'Review triggered'
          : handlerResult.skipReason ?? 'Skipped',
        eventType: 'merge_request',
        handled: handlerResult.handled,
      };
    } else if (isNoteWebhook(body)) {
      const handlerResult = await handleNoteEvent({
        webhook: body,
        reviewEngine: deps.reviewEngine,
        config: deps.eventsConfig,
        webhookEventId,
      });

      result = {
        success: true,
        message: handlerResult.handled
          ? 'Review triggered by command'
          : handlerResult.skipReason ?? 'Skipped',
        eventType: 'note',
        handled: handlerResult.handled,
      };
    } else if (isPushWebhook(body)) {
      const handlerResult = handlePushEvent({
        webhook: body,
        config: deps.eventsConfig,
      });

      result = {
        success: true,
        message: handlerResult.handled
          ? `Push to ${handlerResult.branchReviewed} processed`
          : handlerResult.skipReason ?? 'Skipped',
        eventType: 'push',
        handled: handlerResult.handled,
        details: {
          branch: handlerResult.branchReviewed,
          commitsCount: handlerResult.commitsCount,
        },
      };
    } else {
      result = {
        success: true,
        message: 'Unknown event type',
        eventType: (body as { object_kind?: string }).object_kind,
        handled: false,
      };
    }

    logger.info(
      { requestId, ...result },
      'Webhook processed',
    );

    return result;
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);

    logger.error({ requestId, error: errorMessage }, 'Webhook handler error');

    return {
      success: false,
      message: errorMessage,
    };
  }
}

/**
 * Export event handlers for direct use
 */
export { handleMergeRequestEvent } from './events/merge-request';
export { handleNoteEvent } from './events/note';
export { handlePushEvent } from './events/push';
export * from './types';
export * from './security';
