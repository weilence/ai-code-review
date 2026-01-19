import type { WebhookEventsConfig } from '@/lib/features/config';
import type { ReviewEngine } from '@/lib/features/review';
import { createLogger } from '@/lib/utils/logger';
import type { NoteWebhook } from '../types';

const logger = createLogger('note-handler');

export interface NoteHandlerOptions {
  webhook: NoteWebhook;
  reviewEngine: ReviewEngine;
  config: WebhookEventsConfig;
  webhookEventId?: number;
}

export interface NoteHandlerResult {
  handled: boolean;
  skipped: boolean;
  skipReason?: string;
}

/**
 * Handle note (comment) webhook events
 * Looks for review commands like /review or /ai-review
 */
export async function handleNoteEvent(
  options: NoteHandlerOptions,
): Promise<NoteHandlerResult> {
  const { webhook, reviewEngine, config } = options;
  const { object_attributes: note, project, merge_request: mr } = webhook;

  logger.info(
    {
      projectId: project.id,
      noteId: note.id,
      noteableType: note.noteable_type,
      author: webhook.user.username,
    },
    'Processing note webhook',
  );

  // Check if note events are enabled
  if (!config.note.enabled) {
    logger.debug('Note events disabled');

    return { handled: false, skipped: true, skipReason: 'Note events disabled' };
  }

  // Only handle notes on merge requests
  if (note.noteable_type !== 'MergeRequest' || !mr) {
    logger.debug({ noteableType: note.noteable_type }, 'Note not on merge request');

    return { handled: false, skipped: true, skipReason: 'Not an MR note' };
  }

  // Skip system notes
  if (note.system) {
    logger.debug('Skipping system note');

    return { handled: false, skipped: true, skipReason: 'System note' };
  }

  // Check for review commands
  const noteText = note.note.trim().toLowerCase();
  const command = config.note.commands.find(cmd =>
    noteText.startsWith(cmd.toLowerCase()),
  );

  if (!command) {
    logger.debug(
      { note: noteText.substring(0, 50), commands: config.note.commands },
      'No review command found in note',
    );

    return { handled: false, skipped: true, skipReason: 'No review command' };
  }

  logger.info(
    { projectId: project.id, mrIid: mr.iid, command },
    'Review command detected, triggering review',
  );

  // Trigger review
  try {
    await reviewEngine.reviewMergeRequest({
      projectId: project.id,
      mrIid: mr.iid,
      triggeredBy: 'command',
      triggerEvent: command,
      webhookEventId: options.webhookEventId,
    });

    return { handled: true, skipped: false };
  } catch (error) {
    logger.error({ error, projectId: project.id, mrIid: mr.iid }, 'Failed to trigger review');

    return { handled: false, skipped: true, skipReason: 'Review failed' };
  }
}
