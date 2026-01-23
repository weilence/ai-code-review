/**
 * TaskScheduler - Polling scheduler for queue tasks
 */

import type { QueueConfig, QueueStats } from './schema';
import { TaskQueue } from './queue';
import { WorkerPool } from './worker';
import { createLogger } from '@/lib/utils/logger';

const logger = createLogger('task-scheduler');

export class TaskScheduler {
  private isRunning: boolean = false;
  private pollTimer: NodeJS.Timeout | null = null;
  private cleanupTimer: NodeJS.Timeout | null = null;
  private workerId: string;

  constructor(
    private queue: TaskQueue,
    private workerPool: WorkerPool,
    private config: QueueConfig
  ) {
    // Generate unique worker ID
    this.workerId = `worker-${crypto.randomUUID()}`;
  }

  /**
   * Start the scheduler (begins polling)
   */
  async start(): Promise<void> {
    if (this.isRunning) {
      logger.warn('Scheduler already running');
      return;
    }

    this.isRunning = true;

    // Start polling loop
    this.pollTimer = setInterval(() => {
      this.poll().catch((error) => {
        logger.error({ error }, 'Error in poll loop');
      });
    }, this.config.pollingIntervalMs);

    // Start cleanup loop
    this.cleanupTimer = setInterval(() => {
      this.cleanup().catch((error) => {
        logger.error({ error }, 'Error in cleanup loop');
      });
    }, this.config.cleanupIntervalMs);

    logger.info(
      {
        workerId: this.workerId,
        pollingIntervalMs: this.config.pollingIntervalMs,
      },
      'Scheduler started'
    );

    // Execute first poll immediately
    await this.poll();
  }

  /**
   * Stop the scheduler (graceful shutdown)
   */
  async stop(): Promise<void> {
    if (!this.isRunning) {
      logger.warn('Scheduler not running');
      return;
    }

    logger.info('Stopping scheduler...');

    this.isRunning = false;

    // Clear timers
    if (this.pollTimer) {
      clearInterval(this.pollTimer);
      this.pollTimer = null;
    }

    if (this.cleanupTimer) {
      clearInterval(this.cleanupTimer);
      this.cleanupTimer = null;
    }

    // Wait for all active tasks to complete
    await this.workerPool.drain();

    logger.info('Scheduler stopped');
  }

  /**
   * Single polling iteration
   */
  private async poll(): Promise<void> {
    if (!this.isRunning) {
      return;
    }

    try {
      // Calculate available worker slots
      const availableSlots = this.config.maxConcurrentTasks - this.workerPool.runningCount;

      if (availableSlots <= 0) {
        logger.debug(
          { runningTasks: this.workerPool.runningCount, maxTasks: this.config.maxConcurrentTasks },
          'Max concurrent tasks reached, skipping poll'
        );
        return;
      }

      // Dequeue and execute tasks
      let tasksDequeued = 0;

      for (let i = 0; i < availableSlots; i++) {
        const task = await this.queue.dequeue(this.workerId);

        if (!task) {
          break; // No more tasks available
        }

        // Submit to worker pool (don't await)
        this.workerPool.execute(task).catch((error) => {
          logger.error({ taskId: task.id, error }, 'Worker pool execution failed');
        });

        tasksDequeued++;
      }

      if (tasksDequeued > 0) {
        logger.info({ tasksDequeued, workerId: this.workerId }, 'Tasks dequeued and submitted');
      }

      // Recover stuck tasks
      await this.recoverStuckTasks();
    } catch (error) {
      logger.error({ error }, 'Error in poll loop');
    }
  }

  /**
   * Recover stuck tasks (locked but timeout exceeded)
   */
  private async recoverStuckTasks(): Promise<void> {
    try {
      const stuckTasks = await this.queue.getStuckTasks(this.config.taskTimeoutMs);

      if (stuckTasks.length > 0) {
        logger.warn(
          { stuckTaskCount: stuckTasks.length, timeoutMs: this.config.taskTimeoutMs },
          'Found stuck tasks, recovering...'
        );

        for (const task of stuckTasks) {
          logger.warn(
            { taskId: task.id, lockedBy: task.lockedBy, lockedAt: task.lockedAt },
            'Recovering stuck task'
          );

          // Release lock and requeue
          await this.queue.releaseLock(task.id, task.lockedBy!);
        }
      }
    } catch (error) {
      logger.error({ error }, 'Error recovering stuck tasks');
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

  /**
   * Get queue statistics
   */
  async getStats(): Promise<QueueStats> {
    const stats = await this.queue.getStats();
    return {
      ...stats,
      cancelled: 0, // Cancelled tasks are counted separately
    };
  }
}
