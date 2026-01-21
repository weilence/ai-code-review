// lib/features/config/index.ts
/**
 * Configuration Feature Module
 * 提供应用配置管理
 */

export {
  getConfig,
  loadSystemConfigFromEnv,
  loadConfigFromDB,
  setConfigValue,
  setConfigValues,
  deleteConfigValue,
  getConfigValue,
  refreshConfig,
  getCachedConfig,
  flattenConfig,
  mergeConfig,
} from './loader';

export { AppConfigSchema } from './schema';

// Re-export types from schema
export type {
  AppConfig,
  AIModelConfig,
  Language,
  AIConfig,
  GitLabConfig,
  WebhookEventsConfig,
  ReviewConfig,
} from './schema';

// Re-export types from types/config
export type {
  AppConfig as AppConfigType,
  ReviewRulesConfig,
  WebhookConfig,
  LogConfig,
} from '@/types/config';
