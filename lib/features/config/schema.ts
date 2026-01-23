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
 * 支持从数据库加载的 JSON 字符串或对象
 */
const AIModelsSchema = z
  .union([
    // 从数据库加载时可能是 JSON 字符串
    z.string().transform((str, ctx) => {
      try {
        return JSON.parse(str);
      } catch {
        ctx.addIssue({
          code: 'custom',
          message: 'Invalid JSON format for ai.models',
        });
        return z.NEVER;
      }
    }),
    // 或者已经是对象
    z.record(z.string(), AIModelConfigSchema),
  ])
  .transform((val) => {
    // 确保最终返回的是正确的对象格式
    return val as Record<string, AIModelConfig>;
  });

// ============================================================================
// Helper Schemas
// ============================================================================

const commaSeparated = (defaultValue: string[]) =>
  z.string()
    .optional()
    .transform(s => s ? s.split(',').map(x => x.trim()).filter(Boolean) : defaultValue);

const booleanString = (defaultValue: boolean) =>
  z.string()
    .optional()
    .transform(s => s === undefined ? defaultValue : (defaultValue ? s !== 'false' : s === 'true'));

// ============================================================================
// App Config Schema
// ============================================================================

export const AppConfigSchema = z.object({
  // Server config (Next.js uses PORT env var by default)
  port: z.coerce.number().positive().default(3000),
  host: z.string().default('0.0.0.0'),

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
      enabled: booleanString(true),
      events: commaSeparated(['open', 'update']),
      reviewDrafts: booleanString(false),
    }),
    push: z.object({
      enabled: booleanString(false),
      branches: commaSeparated([]),
    }),
    note: z.object({
      enabled: booleanString(true),
      commands: commaSeparated(['/review', '/ai-review']),
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
    skipFiles: commaSeparated(['*.lock', 'package-lock.json', 'yarn.lock', 'pnpm-lock.yaml', 'bun.lockb', '*.min.js', '*.min.css']),
    inlineComments: booleanString(true),
    summaryComment: booleanString(true),
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
    enabled: booleanString(true),
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

export type AppConfig = z.infer<typeof AppConfigSchema>;
export type Language = AppConfig['review']['language'];
export type AIConfig = AppConfig['ai'];
export type GitLabConfig = AppConfig['gitlab'];
export type WebhookEventsConfig = AppConfig['webhook'];
export type ReviewConfig = AppConfig['review'];
export type QueueConfig = AppConfig['queue'];
