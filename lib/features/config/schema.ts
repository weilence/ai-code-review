import { z } from 'zod';

// ============================================================================
// AI Model Config
// ============================================================================

/**
 * 单个 AI 模型的配置
 * 参考 models.dev 的格式，使用 provider:model-id 作为唯一标识
 */
const AIModelConfigSchema = z.object({
  // 提供商（从 model id 中解析，但也支持显式指定）
  provider: z.string().default('anthropic'),

  // API 认证
  apiKey: z.string().optional(),
  baseUrl: z.string().optional(),

  // 模型参数
  temperature: z.coerce.number().min(0).max(2).optional(),
  maxTokens: z.coerce.number().positive().optional(),
});

export type AIModelConfig = z.infer<typeof AIModelConfigSchema>;

/**
 * AI 模型配置的 Zod schema
 * 新格式直接使用对象，不再需要 JSON 字符串解析
 */
const AIModelsSchema = z.record(z.string(), AIModelConfigSchema);

// ============================================================================
// Helper Schemas
// ============================================================================

// 辅助函数：定义数组类型
const arrayField = (defaultValue: string[]) =>
  z.array(z.string()).default(defaultValue);

// ============================================================================
// System Config Schema (环境变量配置)
// ============================================================================

/**
 * 系统级配置 Schema（从环境变量读取）
 * 只包含服务器启动时的基础配置
 */
export const SystemConfigSchema = z.object({
  port: z.coerce.number().positive().default(3000),
  host: z.string().default('0.0.0.0'),
});

export type SystemConfig = z.infer<typeof SystemConfigSchema>;

// ============================================================================
// Database Config Schema (数据库配置)
// ============================================================================

/**
 * 数据库配置 Schema（从数据库读取）
 * 包含所有业务配置
 */
export const DBConfigSchema = z.object({
  // GitLab config
  gitlab: z.object({
    url: z.string().default('https://gitlab.com'),
    token: z.string().default(''),
    webhookSecret: z.string().default(''),
  }).default({
    url: 'https://gitlab.com',
    token: '',
    webhookSecret: '',
  }),

  // AI config
  ai: z.object({
    // 模型配置字典：key 是 "provider:model-id"，value 是模型配置
    // 例如：{ "anthropic:claude-sonnet-4-5": { provider: "anthropic", apiKey: "...", temperature: 0.7 } }
    models: AIModelsSchema.default({
      'anthropic:claude-sonnet-4-5': {
        provider: 'anthropic',
      },
    }),
  }).default({
    models: {
      'anthropic:claude-sonnet-4-5': {
        provider: 'anthropic',
      },
    },
  }),

  // Webhook config
  webhook: z.object({
    mr: z.object({
      enabled: z.boolean().default(true),
      events: arrayField(['open', 'update']),
      reviewDrafts: z.boolean().default(false),
    }),
    push: z.object({
      enabled: z.boolean().default(false),
      branches: arrayField([]),
    }),
    note: z.object({
      enabled: z.boolean().default(true),
      commands: arrayField(['/review', '/ai-review']),
    }),
  }).default({
    mr: { enabled: true, events: ['open', 'update'], reviewDrafts: false },
    push: { enabled: false, branches: [] },
    note: { enabled: true, commands: ['/review', '/ai-review'] },
  }),

  // Review config
  review: z.object({
    maxFiles: z.coerce.number().positive().default(50),
    maxLinesPerFile: z.coerce.number().positive().default(1000),
    skipFiles: arrayField(['*.lock', 'package-lock.json', 'yarn.lock', 'pnpm-lock.yaml', 'bun.lockb', '*.min.js', '*.min.css']),
    inlineComments: z.boolean().default(true),
    summaryComment: z.boolean().default(true),
    language: z.enum(['简体中文', 'English']).optional(),
    failureBehavior: z.enum(['blocking', 'non-blocking']).default('non-blocking'),
    failureThreshold: z.enum(['critical', 'major', 'minor', 'suggestion']).default('critical'),
  }).default({
    maxFiles: 50,
    maxLinesPerFile: 1000,
    skipFiles: ['*.lock', 'package-lock.json', 'yarn.lock', 'pnpm-lock.yaml', 'bun.lockb', '*.min.js', '*.min.css'],
    inlineComments: true,
    summaryComment: true,
    failureBehavior: 'non-blocking',
    failureThreshold: 'critical',
  }),

  // Log config
  log: z.object({
    level: z.string().optional().transform(s => {
      if (!s) return 'info';
      if (['trace', 'debug', 'info', 'warn', 'error'].includes(s)) {
        return s as 'trace' | 'debug' | 'info' | 'warn' | 'error';
      }
      return 'info';
    }),
  }).default({ level: 'info' }),

  // Queue config
  queue: z.object({
    enabled: z.boolean().default(true),
    pollingIntervalMs: z.coerce.number().positive().default(5000),
    maxConcurrentTasks: z.coerce.number().positive().default(3),
    taskTimeoutMs: z.coerce.number().positive().default(300000),
    maxRetries: z.coerce.number().positive().default(3),
    retryBackoffMs: z.coerce.number().positive().default(60000),
    retryBackoffMultiplier: z.coerce.number().positive().default(2.0),
    maxRetryBackoffMs: z.coerce.number().positive().default(600000),
    cleanupIntervalMs: z.coerce.number().positive().default(3600000),
    retainCompletedDays: z.coerce.number().positive().default(7),
  }).default({
    enabled: true,
    pollingIntervalMs: 5000,
    maxConcurrentTasks: 3,
    taskTimeoutMs: 300000,
    maxRetries: 3,
    retryBackoffMs: 60000,
    retryBackoffMultiplier: 2.0,
    maxRetryBackoffMs: 600000,
    cleanupIntervalMs: 3600000,
    retainCompletedDays: 7,
  }),
});

export type DBConfig = z.infer<typeof DBConfigSchema>;

export type Language = DBConfig['review']['language'];
export type AIConfig = DBConfig['ai'];
export type GitLabConfig = DBConfig['gitlab'];
export type WebhookEventsConfig = DBConfig['webhook'];
export type ReviewConfig = DBConfig['review'];
export type QueueConfig = DBConfig['queue'];
