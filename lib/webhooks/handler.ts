import type { WebhookEventsConfig } from '@/lib/features/config';
import type { ReviewEngine } from '@/lib/features/review';
import { AI_COMMENT_MARKER } from '@/lib/features/review/prompts';
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

const logger = createLogger('webhook-handler');

/**
 * Check if a webhook should be ignored before processing
 * Returns the reason to ignore, or undefined if not ignored
 */
function shouldIgnoreWebhook(webhook: GitLabWebhook): string | undefined {
  // Ignore AI-generated comments to prevent database clutter
  if (isNoteWebhook(webhook)) {
    const { object_attributes } = webhook;
    if (object_attributes.note?.includes(AI_COMMENT_MARKER)) {
      return 'AI-generated comment';
    }
  }
  return undefined;
}

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

    // Validate required webhook fields
    if (!body.object_kind) {
      logger.warn({ body }, 'Invalid webhook: missing object_kind');
      return {
        success: false,
        message: 'Invalid webhook payload: missing object_kind field',
      };
    }

    if (!body.project || !body.project.id) {
      logger.warn({ body }, 'Invalid webhook: missing project.id');
      return {
        success: false,
        message: 'Invalid webhook payload: missing project information',
      };
    }

    // Validate that the event type is supported
    if (!SUPPORTED_EVENT_TYPES.includes(body.object_kind)) {
      logger.warn({ objectKind: body.object_kind }, 'Unsupported object_kind');
      return {
        success: false,
        message: `Unsupported object_kind: ${body.object_kind}`,
        handled: false,
      };
    }

    // Check if webhook should be ignored before logging to database
    const ignoreReason = shouldIgnoreWebhook(body);
    if (ignoreReason) {
      logger.debug({ requestId, ignoreReason }, 'Ignoring webhook before database logging');
      return {
        success: true,
        message: `Webhook ignored: ${ignoreReason}`,
        eventType: body.object_kind,
        handled: false,
      };
    }

    // Log webhook to database
    const db = getDb();
    const webhookRecord = await db.insert(webhooks).values({
      objectKind: body.object_kind,
      payload: body,
      projectId: body.project.id.toString(),
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
