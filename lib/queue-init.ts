/**
 * Queue Manager Initialization
 *
 * This module initializes the queue manager when the application starts.
 * It should be imported in the app layout to ensure the queue starts
 * when the Next.js server boots up.
 */

import { getQueueManager } from '@/lib/features/queue';
import { createLogger } from '@/lib/utils/logger';

const logger = createLogger('queue-init');

let initialized = false;

/**
 * Initialize the queue manager
 * Should be called during application startup
 */
export async function initQueueManager(): Promise<void> {
  if (initialized) {
    logger.debug('Queue manager already initialized');
    return;
  }

  try {
    logger.info('Initializing queue manager...');

    const queueManager = await getQueueManager();
    await queueManager.start();

    initialized = true;
    logger.info('Queue manager initialized successfully');
  } catch (error) {
    logger.error({ error }, 'Failed to initialize queue manager');
    throw error;
  }
}

/**
 * Get the initialization status
 */
export function isQueueManagerInitialized(): boolean {
  return initialized;
}
