import type { NoteWebhook } from '../types';
import type { ReviewEngine } from '../../review/engine';
import type { WebhookEventsConfig } from '../../config/schema';
import { createLogger } from '../../utils/logger';

const logger = createLogger('note-handler');

export interface NoteHandlerOptions {
  webhook: NoteWebhook;
  reviewEngine: ReviewEngine;
  config: WebhookEventsConfig;
}

export interface NoteHandlerResult {
  handled: boolean;
  skipped: boolean;
  skipReason?: string;
  reviewResult?: {
    inlineCommentsPosted: number;
    summaryPosted: boolean;
    errors: string[];
  };
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

  // Check if MR is still open
  if (mr.state !== 'opened') {
    logger.debug({ mrIid: mr.iid, state: mr.state }, 'Skipping review for non-open MR');

    return { handled: false, skipped: true, skipReason: `MR state: ${mr.state}` };
  }

  // Perform the review
  try {
    const result = await reviewEngine.reviewMergeRequest({
      projectId: project.id,
      mrIid: mr.iid,
    });

    logger.info(
      {
        projectId: project.id,
        mrIid: mr.iid,
        inlineCommentsPosted: result.inlineCommentsPosted,
        summaryPosted: result.summaryPosted,
        command,
      },
      'Command-triggered review completed',
    );

    return {
      handled: true,
      skipped: false,
      reviewResult: {
        inlineCommentsPosted: result.inlineCommentsPosted,
        summaryPosted: result.summaryPosted,
        errors: result.errors,
      },
    };
  } catch (error) {
    logger.error(
      { error, projectId: project.id, mrIid: mr.iid, command },
      'Failed to execute command-triggered review',
    );
    throw error;
  }
}
