/**
 * WorkerPool - Manage concurrent task execution
 */

import type { TaskExecutor } from './executor';
import type { QueueTask } from '@/lib/db';
import type { ExecutionResult, WorkerStats } from './schema';
import { TaskQueue } from './queue';
import { createLogger } from '@/lib/utils/logger';

const logger = createLogger('worker-pool');

export class WorkerPool {
  private activeTasks: Map<number, Promise<ExecutionResult>> = new Map();
  private completedCount: number = 0;
  private failedCount: number = 0;

  constructor(
    private executor: TaskExecutor,
    private queue: TaskQueue,
    private maxConcurrentTasks: number
  ) {}

  /**
   * Submit task to worker pool
   */
  async execute(task: QueueTask): Promise<ExecutionResult> {
    // Check concurrent limit
    if (this.activeTasks.size >= this.maxConcurrentTasks) {
      throw new Error(`Max concurrent tasks limit reached: ${this.maxConcurrentTasks}`);
    }

    logger.debug(
      { taskId: task.id, activeTasks: this.activeTasks.size },
      'Submitting task to worker pool'
    );

    // Execute task in background
    const promise = this.executeTask(task);
    this.activeTasks.set(task.id, promise);

    // Handle completion
    promise.finally(() => {
      this.activeTasks.delete(task.id);
    });

    return promise;
  }

  /**
   * Execute single task with error handling
   */
  private async executeTask(task: QueueTask): Promise<ExecutionResult> {
    try {
      const result = await this.executor.execute(task);

      // Update statistics
      if (result.success) {
        await this.queue.markCompleted(task.id, result.reviewId!, result.durationMs);
        this.completedCount++;
      } else {
        // Handle failure with retry logic
        await this.handleFailure(task, result.error!);
        this.failedCount++;
      }

      return result;
    } catch (error) {
      logger.error({ taskId: task.id, error }, 'Unexpected error in task execution');

      const errorObj = error instanceof Error ? error : new Error(String(error));
      await this.handleFailure(task, errorObj);
      this.failedCount++;

      return {
        success: false,
        taskId: task.id,
        error: errorObj,
        durationMs: 0,
      };
    }
  }

  /**
   * Handle task failure with retry logic
   */
  private async handleFailure(task: QueueTask, error: Error): Promise<void> {
    const retryHandler = this.executor['retryHandler']; // Access private property

    if (retryHandler.shouldRetry(task.attemptNumber, error)) {
      // Calculate next retry time
      const nextRetryAt = retryHandler.calculateNextRetryTime(
        task.attemptNumber - 1,
        error
      );

      await this.queue.markFailed(task.id, error, nextRetryAt);
    } else {
      // No more retries
      await this.queue.markFailed(task.id, error);
    }
  }

  /**
   * Get current running task count
   */
  get runningCount(): number {
    return this.activeTasks.size;
  }

  /**
   * Get worker statistics
   */
  getStats(): WorkerStats {
    return {
      workerId: 'pool',
      runningTasks: this.activeTasks.size,
      completedTasks: this.completedCount,
      failedTasks: this.failedCount,
      startTime: new Date(),
    };
  }

  /**
   * Wait for all active tasks to complete
   */
  async drain(): Promise<void> {
    logger.info(
      { activeTasks: this.activeTasks.size },
      'Waiting for active tasks to complete...'
    );

    const promises = Array.from(this.activeTasks.values());
    await Promise.allSettled(promises);

    logger.info('All active tasks completed');
  }
}
