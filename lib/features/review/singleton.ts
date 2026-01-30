import { ReviewEngine } from './engine';
import { ReviewScheduler } from './scheduler';
import { createLogger } from '@/lib/utils/logger';

const logger = createLogger('review-singleton');

export async function getReviewEngine(): Promise<ReviewEngine> {
  if (!globalThis.__REVIEW_ENGINE__) {
    throw new Error(
      'ReviewEngine has not been initialized. Make sure the server is running.',
    );
  }

  return globalThis.__REVIEW_ENGINE__;
}

export function resetReviewEngine(): void {
  globalThis.__REVIEW_ENGINE__ = undefined;
}

export function initScheduler(reviewEngine: ReviewEngine, pollingIntervalMs: number = 5000): void {
  if (globalThis.__REVIEW_SCHEDULER__) {
    logger.warn('Scheduler already initialized');
    return;
  }
  globalThis.__REVIEW_SCHEDULER__ = new ReviewScheduler(reviewEngine, pollingIntervalMs);
  logger.info('Scheduler initialized');
}

export async function startScheduler(): Promise<void> {
  if (!globalThis.__REVIEW_SCHEDULER__) {
    throw new Error('Scheduler not initialized. Call initScheduler first.');
  }
  await globalThis.__REVIEW_SCHEDULER__.start();
}

export async function stopScheduler(): Promise<void> {
  if (globalThis.__REVIEW_SCHEDULER__) {
    await globalThis.__REVIEW_SCHEDULER__.stop();
  }
}

export function getScheduler(): ReviewScheduler {
  if (!globalThis.__REVIEW_SCHEDULER__) {
    throw new Error('Scheduler not initialized');
  }
  return globalThis.__REVIEW_SCHEDULER__;
}
