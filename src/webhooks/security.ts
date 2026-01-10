import { createLogger } from '../utils/logger';
import { WebhookVerificationError } from '../utils/errors';

const logger = createLogger('webhook-security');

export interface VerifyOptions {
  secret: string;
  token: string | null | undefined;
  eventType?: string;
}

/**
 * Verify GitLab webhook signature
 * GitLab uses X-Gitlab-Token header for webhook verification
 */
export function verifyWebhookSignature(options: VerifyOptions): void {
  const { secret, token } = options;

  if (!token) {
    logger.warn('Webhook received without token');
    throw new WebhookVerificationError('Missing X-Gitlab-Token header');
  }

  // Constant-time comparison to prevent timing attacks
  if (!timingSafeEqual(secret, token)) {
    logger.warn('Webhook token mismatch');
    throw new WebhookVerificationError('Invalid webhook token');
  }

  logger.debug({ eventType: options.eventType }, 'Webhook signature verified');
}

/**
 * Constant-time string comparison
 */
function timingSafeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) {
    return false;
  }

  let result = 0;

  for (let i = 0; i < a.length; i++) {
    result |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }

  return result === 0;
}

/**
 * Validate webhook event type
 */
export function validateEventType(
  eventType: string | null | undefined,
  allowedTypes: string[],
): boolean {
  if (!eventType) {
    logger.warn('Webhook received without event type');

    return false;
  }

  const isAllowed = allowedTypes.includes(eventType);

  if (!isAllowed) {
    logger.debug({ eventType, allowedTypes }, 'Event type not in allowed list');
  }

  return isAllowed;
}

/**
 * List of supported webhook event types
 */
export const SUPPORTED_EVENT_TYPES = [
  'merge_request',
  'push',
  'note',
] as const;

export type SupportedEventType = (typeof SUPPORTED_EVENT_TYPES)[number];
