// lib/features/config/index.ts
/**
 * Configuration Feature Module
 * 提供应用配置管理
 */

export {
  getDBConfig,
  setDBConfig,
} from './loader';

export { DBConfigSchema } from './schema';

// Re-export types from schema
export type {
  DBConfig,
  AIModelConfig,
  Language,
  AIConfig,
  GitLabConfig,
  WebhookEventsConfig,
  ReviewConfig,
  QueueConfig,
  CopilotConfig,
} from './schema';
