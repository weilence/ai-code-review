/**
 * RetryHandler - Retry logic with exponential backoff
 */

import type { QueueConfig, ErrorType } from './schema';
import { createLogger } from '@/lib/utils/logger';

const logger = createLogger('retry-handler');

export class RetryHandler {
  constructor(private config: QueueConfig) {}

  /**
   * Calculate next retry time with exponential backoff
   * delay = min(baseDelay * (multiplier ^ retryCount), maxBackoff)
   */
  calculateNextRetryTime(retryCount: number, error?: Error): Date {
    // Error parameter can be used in the future to customize retry delay based on error type
    void error; // Suppress unused warning
    const baseDelay = this.config.retryBackoffMs;
    const multiplier = this.config.retryBackoffMultiplier;
    const maxBackoff = this.config.maxRetryBackoffMs;

    // Exponential backoff formula
    const delay = Math.min(
      baseDelay * Math.pow(multiplier, retryCount),
      maxBackoff
    );

    const nextRetryTime = new Date(Date.now() + delay);

    logger.debug(
      { retryCount, delayMs: delay, nextRetryTime },
      'Calculated next retry time'
    );

    return nextRetryTime;
  }

  /**
   * Determine if error is retryable
   */
  isRetryable(error: Error): boolean {
    const type = this.classifyError(error);
    return type === 'transient' || type === 'rate-limit';
  }

  /**
   * Classify error type for better retry decisions
   */
  classifyError(error: Error): ErrorType {
    const message = error.message.toLowerCase();

    // Transient errors (network, temporary)
    if (/econnrefused|etimedout|etimedout|timeout|network/i.test(message)) {
      return 'transient';
    }

    // Rate limiting
    if (/rate limit|429|too many requests|quota exceeded/i.test(message)) {
      return 'rate-limit';
    }

    // Permanent errors (auth, config)
    if (/unauthorized|401|authentication|forbidden|403/i.test(message)) {
      return 'permanent';
    }

    return 'unknown';
  }

  /**
   * Check if task should be retried
   */
  shouldRetry(attemptNumber: number, error: Error): boolean {
    // Check max retries
    if (attemptNumber >= this.config.maxRetries) {
      logger.debug(
        { attemptNumber, maxRetries: this.config.maxRetries },
        'Max retries exceeded'
      );
      return false;
    }

    // Check if error is retryable
    const retryable = this.isRetryable(error);
    if (!retryable) {
      logger.debug(
        { errorType: this.classifyError(error) },
        'Error is not retryable'
      );
      return false;
    }

    return true;
  }

  /**
   * Get custom retry delay for rate limit errors
   */
  getRateLimitRetryDelay(error: Error): number | null {
    const message = error.message.toLowerCase();

    // Try to extract Retry-After header info from error message
    // This depends on the error format from the AI provider
    const match = message.match(/retry\s*after\s*:?\s*(\d+)/i);
    if (match && match[1]) {
      const seconds = parseInt(match[1], 10);
      return seconds * 1000;
    }

    return null; // Use default exponential backoff
  }
}
