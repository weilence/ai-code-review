/**
 * TaskExecutor - Execute review tasks
 */

import { getDb, reviews } from '@/lib/db';
import type { ReviewEngine } from '@/lib/features/review/engine';
import type { QueueTask } from '@/lib/db';
import type { ExecutionResult } from './schema';
import { RetryHandler } from './retry-handler';
import { createLogger } from '@/lib/utils/logger';

const logger = createLogger('task-executor');

export class TaskExecutor {
  // Expose retry handler for WorkerPool access
  retryHandler: RetryHandler;

  constructor(
    private reviewEngine: ReviewEngine,
    retryHandler: RetryHandler
  ) {
    this.retryHandler = retryHandler;
  }

  /**
   * Execute a review task
   */
  async execute(task: QueueTask): Promise<ExecutionResult> {
    const startTime = Date.now();

    logger.info(
      {
        taskId: task.id,
        projectId: task.projectId,
        mrIid: task.mrIid,
        attemptNumber: task.attemptNumber,
      },
      'Executing task'
    );

    try {
      // Get MR information from GitLab
      // Note: ReviewEngine.reviewMergeRequest will call this internally
      // We just need to create the review record first

      const db = await getDb();

      // Create reviews record (status=running)
      // If this is a retry, there might be a reviewId already
      let reviewId: number;

      if (task.reviewId) {
        // Reuse existing review record
        reviewId = task.reviewId;
        logger.info({ taskId: task.id, reviewId }, 'Reusing existing review record');
      } else {
        // Create new review record
        const [review] = await db.insert(reviews).values({
          projectId: task.projectId,
          projectPath: task.projectPath,
          mrIid: task.mrIid,
          mrTitle: task.mrTitle,
          mrAuthor: task.mrAuthor,
          mrDescription: task.mrDescription || undefined,
          sourceBranch: task.sourceBranch,
          targetBranch: task.targetBranch,
          status: 'running',
          triggeredBy: task.triggeredBy,
          triggerEvent: task.triggerEvent,
          webhookEventId: task.webhookEventId || undefined,
          retryCount: task.attemptNumber - 1,
          startedAt: new Date(),
        }).returning();

        if (!review) {
          throw new Error('Failed to create review record');
        }

        reviewId = review.id;
        logger.info({ taskId: task.id, reviewId }, 'Created new review record');
      }

      // Execute review using ReviewEngine
      const result = await this.reviewEngine.reviewMergeRequest({
        projectId: Number(task.projectId),
        mrIid: task.mrIid,
        reviewId, // Pass reviewId to reuse the record
        triggeredBy: task.triggeredBy,
        triggerEvent: task.triggerEvent || undefined,
        webhookEventId: task.webhookEventId || undefined,
      });

      const durationMs = Date.now() - startTime;

      logger.info(
        {
          taskId: task.id,
          reviewId,
          durationMs,
          inlineCommentsPosted: result.inlineCommentsPosted,
          summaryPosted: result.summaryPosted,
        },
        'Task completed successfully'
      );

      return {
        success: true,
        taskId: task.id,
        reviewId,
        durationMs,
      };
    } catch (error) {
      const durationMs = Date.now() - startTime;
      const errorObj = error instanceof Error ? error : new Error(String(error));

      logger.error(
        {
          taskId: task.id,
          error: errorObj.message,
          durationMs,
        },
        'Task execution failed'
      );

      return {
        success: false,
        taskId: task.id,
        error: errorObj,
        durationMs,
      };
    }
  }
}
