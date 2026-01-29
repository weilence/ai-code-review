/**
 * SimpleTaskScheduler - Single-threaded serial task scheduler
 * Processes tasks one by one, ensuring no concurrent execution
 */

import type { QueueConfig } from './schema';
import { TaskQueue } from './queue';
import type { TaskExecutor } from './executor';
import { createLogger } from '@/lib/utils/logger';

const logger = createLogger('task-scheduler');

export class SimpleTaskScheduler {
  private isRunning: boolean = false;
  private isProcessing: boolean = false;
  private pollTimer: NodeJS.Timeout | null = null;
  private cleanupTimer: NodeJS.Timeout | null = null;

  constructor(
    private queue: TaskQueue,
    private executor: TaskExecutor,
    private config: QueueConfig
  ) {}

  /**
   * Start scheduler (begins polling)
   */
  async start(): Promise<void> {
    if (this.isRunning) {
      logger.warn('Scheduler already running');
      return;
    }

    this.isRunning = true;

    this.pollTimer = setInterval(() => {
      this.poll().catch((error) => {
        logger.error({ error }, 'Error in poll loop');
      });
    }, this.config.pollingIntervalMs);

    this.cleanupTimer = setInterval(() => {
      this.cleanup().catch((error) => {
        logger.error({ error }, 'Error in cleanup loop');
      });
    }, this.config.cleanupIntervalMs);

    logger.info(
      {
        pollingIntervalMs: this.config.pollingIntervalMs,
      },
      'Scheduler started'
    );

    await this.poll();
  }

  /**
   * Stop scheduler (graceful shutdown)
   */
  async stop(): Promise<void> {
    if (!this.isRunning) {
      logger.warn('Scheduler not running');
      return;
    }

    logger.info('Stopping scheduler...');

    this.isRunning = false;

    if (this.pollTimer) {
      clearInterval(this.pollTimer);
      this.pollTimer = null;
    }

    if (this.cleanupTimer) {
      clearInterval(this.cleanupTimer);
      this.cleanupTimer = null;
    }

    logger.info('Scheduler stopped');
  }

  /**
   * Single polling iteration - process one task at a time
   */
  private async poll(): Promise<void> {
    if (!this.isRunning || this.isProcessing) {
      return;
    }

    try {
      const task = await this.queue.dequeue('simple-scheduler');

      if (!task) {
        return;
      }

      this.isProcessing = true;

      logger.info(
        {
          taskId: task.id,
          projectId: task.projectId,
          mrIid: task.mrIid,
        },
        'Processing task'
      );

      try {
        const result = await this.executor.execute(task);

        if (result.success) {
          await this.queue.markCompleted(task.id, result.reviewId!, result.durationMs);
          logger.info({ taskId: task.id, reviewId: result.reviewId }, 'Task completed');
        } else {
          await this.queue.markFailed(task.id, result.error!);
          logger.error({ taskId: task.id, error: result.error?.message }, 'Task failed');
        }
      } catch (error) {
        logger.error({ taskId: task.id, error }, 'Task execution error');
        const errorObj = error instanceof Error ? error : new Error(String(error));
        await this.queue.markFailed(task.id, errorObj);
      } finally {
        this.isProcessing = false;
      }
    } catch (error) {
      logger.error({ error }, 'Error in poll loop');
      this.isProcessing = false;
    }
  }

  /**
   * Cleanup old completed tasks
   */
  private async cleanup(): Promise<void> {
    try {
      const deletedCount = await this.queue.cleanupOldTasks(this.config.retainCompletedDays);

      if (deletedCount > 0) {
        logger.info(
          { deletedCount, retainDays: this.config.retainCompletedDays },
          'Cleaned up old completed tasks'
        );
      }
    } catch (error) {
      logger.error({ error }, 'Error in cleanup loop');
    }
  }
}
