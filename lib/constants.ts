export const DEFAULT_AI_MODEL = 'anthropic:claude-sonnet-4-5' as const;

export const DEFAULT_CONFIG = {
  PORT: 3000,
  HOST: '0.0.0.0',
  GITLAB_URL: 'https://gitlab.com' as const,
  REVIEW_MAX_FILES: 50,
  REVIEW_MAX_LINES_PER_FILE: 1000,
  LOG_LEVEL: 'info' as const,
} as const;

export const WEBHOOK_EVENT_TYPES = {
  MERGE_REQUEST: 'merge_request',
  PUSH: 'push',
  TAG_PUSH: 'tag_push',
  NOTE: 'note',
} as const;

export type WebhookEventType = typeof WEBHOOK_EVENT_TYPES[keyof typeof WEBHOOK_EVENT_TYPES];

export const REVIEW_STATUS = {
  PENDING: 'pending',
  RUNNING: 'running',
  COMPLETED: 'completed',
  FAILED: 'failed',
} as const;

export type ReviewStatus = typeof REVIEW_STATUS[keyof typeof REVIEW_STATUS];

export const TRIGGER_TYPES = {
  WEBHOOK: 'webhook',
  MANUAL: 'manual',
  COMMAND: 'command',
} as const;

export type TriggerType = typeof TRIGGER_TYPES[keyof typeof TRIGGER_TYPES];

export const REVIEW_COMMANDS = {
  REVIEW: '/review',
  AI_REVIEW: '/ai-review',
} as const;

export const DEFAULT_SKIP_PATTERNS = [
  '*.lock',
  'package-lock.json',
  'yarn.lock',
  'pnpm-lock.yaml',
  'bun.lockb',
  '*.min.js',
  '*.min.css',
] as const;

export const DEFAULT_WEBHOOK_MR_EVENTS = [
  'open',
  'update',
] as const;

export const SEVERITY_LEVELS = {
  CRITICAL: 'critical',
  MAJOR: 'major',
  MINOR: 'minor',
  SUGGESTION: 'suggestion',
} as const;

export type SeverityLevel = typeof SEVERITY_LEVELS[keyof typeof SEVERITY_LEVELS];

export const FAILURE_BEHAVIOR = {
  BLOCKING: 'blocking',
  NON_BLOCKING: 'non-blocking',
} as const;

export type FailureBehavior = typeof FAILURE_BEHAVIOR[keyof typeof FAILURE_BEHAVIOR];

export const FILE_LIMITS = {
  MAX_FILES: DEFAULT_CONFIG.REVIEW_MAX_FILES,
  MAX_LINES_PER_FILE: DEFAULT_CONFIG.REVIEW_MAX_LINES_PER_FILE,
} as const;

export const CACHE_CONFIG = {
  CONFIG_REVALIDATE: 60, // seconds
  CACHE_TAG: 'config' as const,
} as const;

export const API_ENDPOINTS = {
  WEBHOOK: '/api/webhook',
  HEALTH: '/api/health',
} as const;

export const ROUTES = {
  HOME: '/',
  REVIEWS: '/reviews',
  SETTINGS: '/settings',
  WEBHOOKS: '/webhooks',
} as const;

export const TIME_CONSTANTS = {
  SECOND: 1000,
  MINUTE: 60 * 1000,
  HOUR: 60 * 60 * 1000,
  DAY: 24 * 60 * 60 * 1000,
} as const;
