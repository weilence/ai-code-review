import type { ReviewEngine } from '@/lib/features/review/engine';
import type { QueueConfig, EnqueueOptions, QueueStats } from './schema';
import { TaskQueue } from './queue';
import { SimpleTaskScheduler } from './scheduler';
import { TaskExecutor } from './executor';
import { createLogger } from '@/lib/utils/logger';

const logger = createLogger('queue-manager');

export class QueueManager {
  private isRunning: boolean = false;

  private queue: TaskQueue;
  private executor: TaskExecutor;
  private scheduler: SimpleTaskScheduler;

  constructor(
    reviewEngine: ReviewEngine,
    private config: QueueConfig
  ) {
    this.queue = new TaskQueue();
    this.executor = new TaskExecutor(reviewEngine);
    this.scheduler = new SimpleTaskScheduler(
      this.queue,
      this.executor,
      config
    );
  }

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

    this.isRunning = true;
    logger.info('Queue manager started successfully');
  }

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

  async enqueue(options: EnqueueOptions): Promise<number> {
    logger.debug({ options }, 'Enqueueing task');

    const taskId = await this.queue.enqueue(options);

    logger.info({ taskId }, 'Task enqueued successfully');

    return taskId;
  }

  async getStats(): Promise<QueueStats> {
    return await this.queue.getStats();
  }

  isActive(): boolean {
    return this.isRunning;
  }

  get queueConfig(): QueueConfig {
    return this.config;
  }
}

export async function getQueueManager(): Promise<QueueManager> {
  if (!globalThis.__QUEUE_MANAGER__) {
    throw new Error(
      'QueueManager has not been initialized. Make sure the server is running.',
    );
  }

  return globalThis.__QUEUE_MANAGER__;
}

export function resetQueueManager(): void {
  if (globalThis.__QUEUE_MANAGER__) {
    globalThis.__QUEUE_MANAGER__.stop();
  }
  globalThis.__QUEUE_MANAGER__ = undefined;
}
