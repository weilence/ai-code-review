// types/config.ts

/**
 * AI 提供商配置
 */
export interface AIProviderConfig {
  provider: 'anthropic' | 'openai' | 'github' | 'openai-compatible';
  apiKey?: string;
  baseURL?: string; // 用于兼容 API
  models: string[];
}

/**
 * GitLab 配置
 */
export interface GitlabConfig {
  url: string;
  token: string;
  webhookSecret?: string;
}

/**
 * 审查规则配置
 */
export interface ReviewRulesConfig {
  skipFiles: string[]; // glob 模式
  maxFiles: number;
  maxLinesPerFile: number;
  failureThreshold: 'critical' | 'major' | 'minor' | 'suggestion' | 'none';
  blocking: boolean;
}

/**
 * Webhook 配置
 */
export interface WebhookConfig {
  events: ('merge-request' | 'note' | 'push')[];
  autoReview: boolean;
}

/**
 * 日志配置
 */
export interface LogConfig {
  level: 'trace' | 'debug' | 'info' | 'warn' | 'error';
}

/**
 * 完整的应用配置
 */
export interface AppConfig {
  gitlab: GitlabConfig;
  ai: AIProviderConfig[];
  webhook: WebhookConfig;
  review: ReviewRulesConfig;
  log: LogConfig;
}
