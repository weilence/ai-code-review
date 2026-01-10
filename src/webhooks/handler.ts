import type { Context } from 'hono';
import {
  type GitLabWebhook,
  isMergeRequestWebhook,
  isPushWebhook,
  isNoteWebhook,
  extractWebhookMeta,
} from './types';
import { verifyWebhookSignature, SUPPORTED_EVENT_TYPES } from './security';
import { handleMergeRequestEvent } from './events/merge-request';
import { handleNoteEvent } from './events/note';
import { handlePushEvent } from './events/push';
import type { ReviewEngine } from '../review/engine';
import type { WebhookEventsConfig } from '../config/schema';
import { createLogger } from '../utils/logger';
import { WebhookVerificationError, AppError } from '../utils/errors';

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
export function createWebhookHandler(deps: {
  webhookSecret: string;
  reviewEngine: ReviewEngine;
  eventsConfig: WebhookEventsConfig;
}) {
  return async (c: Context): Promise<Response> => {
    const requestId = crypto.randomUUID();

    try {
      // Get headers
      const token = c.req.header('X-Gitlab-Token');
      const eventType = c.req.header('X-Gitlab-Event');

      logger.info({ requestId, eventType }, 'Received webhook request');

      // Verify signature
      verifyWebhookSignature({
        secret: deps.webhookSecret,
        token,
        eventType,
      });

      // Parse body
      const body = await c.req.json<GitLabWebhook>();

      // Validate event type
      if (!eventType || !SUPPORTED_EVENT_TYPES.includes(body.object_kind)) {
        logger.debug(
          { eventType, objectKind: body.object_kind },
          'Unsupported event type',
        );

        return c.json<WebhookResponse>({
          success: true,
          message: 'Event type not supported, skipping',
          eventType: body.object_kind,
          handled: false,
        });
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
        });

        result = {
          success: true,
          message: handlerResult.handled
            ? 'Merge request reviewed'
            : handlerResult.skipReason ?? 'Skipped',
          eventType: 'merge_request',
          handled: handlerResult.handled,
          details: handlerResult.reviewResult,
        };
      } else if (isNoteWebhook(body)) {
        const handlerResult = await handleNoteEvent({
          webhook: body,
          reviewEngine: deps.reviewEngine,
          config: deps.eventsConfig,
        });

        result = {
          success: true,
          message: handlerResult.handled
            ? 'Review triggered by command'
            : handlerResult.skipReason ?? 'Skipped',
          eventType: 'note',
          handled: handlerResult.handled,
          details: handlerResult.reviewResult,
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

      return c.json(result);
    } catch (error) {
      if (error instanceof WebhookVerificationError) {
        logger.warn({ requestId, error: error.message }, 'Webhook verification failed');

        return c.json<WebhookResponse>(
          {
            success: false,
            message: error.message,
          },
          401,
        );
      }

      if (error instanceof AppError) {
        logger.error({ requestId, error: error.message, code: error.code }, 'Webhook handler error');

        return c.json<WebhookResponse>(
          {
            success: false,
            message: error.message,
          },
          500,
        );
      }

      logger.error({ requestId, error }, 'Unexpected error in webhook handler');

      return c.json<WebhookResponse>(
        {
          success: false,
          message: 'Internal server error',
        },
        500,
      );
    }
  };
}

/**
 * Export event handlers for direct use
 */
export { handleMergeRequestEvent } from './events/merge-request';
export { handleNoteEvent } from './events/note';
export { handlePushEvent } from './events/push';
export * from './types';
export * from './security';
