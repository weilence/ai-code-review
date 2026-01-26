/**
 * QueueManager - Singleton queue manager coordinating all components
 */

import type { ReviewEngine } from '@/lib/features/review/engine';
import type { QueueConfig, EnqueueOptions, QueueStats, WorkerStats } from './schema';
import { TaskQueue } from './queue';
import { TaskScheduler } from './scheduler';
import { TaskExecutor } from './executor';
import { WorkerPool } from './worker';
import { RetryHandler } from './retry-handler';
import { createLogger } from '@/lib/utils/logger';

const logger = createLogger('queue-manager');

export class QueueManager {
  private isRunning: boolean = false;

  private queue: TaskQueue;
  private retryHandler: RetryHandler;
  private executor: TaskExecutor;
  private workerPool: WorkerPool;
  private scheduler: TaskScheduler;

  constructor(
    reviewEngine: ReviewEngine,
    private config: QueueConfig
  ) {
    // Initialize components
    this.queue = new TaskQueue();
    this.retryHandler = new RetryHandler(config);
    this.executor = new TaskExecutor(reviewEngine, this.retryHandler);
    this.workerPool = new WorkerPool(
      this.executor,
      this.queue,
      config.maxConcurrentTasks
    );
    this.scheduler = new TaskScheduler(this.queue, this.workerPool, config);
  }

  /**
   * Start the queue manager
   */
  async start(): Promise<void> {
    if (this.isRunning) {
      logger.warn('Queue manager already running');
      return;
    }

    if (!this.config.enabled) {
      logger.info('Queue system is disabled, not starting');
      return;
    }

    logger.info('Starting queue manager...');

    await this.scheduler.start();

    // Register shutdown hooks
    this.registerShutdownHooks();

    this.isRunning = true;
    logger.info('Queue manager started successfully');
  }

  /**
   * Stop the queue manager (graceful shutdown)
   */
  async stop(): Promise<void> {
    if (!this.isRunning) {
      logger.warn('Queue manager not running');
      return;
    }

    logger.info('Stopping queue manager...');

    await this.scheduler.stop();

    this.isRunning = false;
    logger.info('Queue manager stopped successfully');
  }

  /**
   * Enqueue a new review task
   */
  async enqueue(options: EnqueueOptions): Promise<number> {
    logger.debug({ options }, 'Enqueueing task');

    const taskId = await this.queue.enqueue(options);

    logger.info({ taskId }, 'Task enqueued successfully');

    return taskId;
  }

  /**
   * Get queue statistics
   */
  async getStats(): Promise<QueueStats> {
    return await this.scheduler.getStats();
  }

  /**
   * Get worker statistics
   */
  getWorkerStats(): WorkerStats {
    return this.workerPool.getStats();
  }

  /**
   * Check if queue manager is running
   */
  isActive(): boolean {
    return this.isRunning;
  }

  /**
   * Get configuration
   */
  get queueConfig(): QueueConfig {
    return this.config;
  }

  /**
   * Register process shutdown hooks
   */
  private registerShutdownHooks(): void {
    const shutdown = async (signal: string) => {
      logger.info({ signal }, 'Received shutdown signal');
      await this.stop();
      process.exit(0);
    };

    process.on('SIGTERM', () => shutdown('SIGTERM'));
    process.on('SIGINT', () => shutdown('SIGINT'));
  }
}

// ============================================================================
// Singleton Instance
// ============================================================================

let managerInstance: QueueManager | null = null;

export async function getQueueManager(): Promise<QueueManager> {
  if (!managerInstance) {
    // Lazy initialization
    // Import here to avoid circular dependencies
    const { getReviewEngine } = await import('@/lib/features/review/singleton');
    const { getDBConfig } = await import('@/lib/features/config');

    const reviewEngine = await getReviewEngine();
    const config = await getDBConfig();

    managerInstance = new QueueManager(reviewEngine, config.queue);

    logger.info('Queue manager singleton created');
  }

  return managerInstance;
}

/**
 * Reset queue manager (mainly for testing)
 */
export function resetQueueManager(): void {
  if (managerInstance && managerInstance.isActive()) {
    managerInstance.stop();
  }
  managerInstance = null;
  logger.info('Queue manager singleton reset');
}
