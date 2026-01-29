import { z } from 'zod';

const AIModelConfigSchema = z.object({
  provider: z.string().default('anthropic'),
  apiKey: z.string().optional(),
  baseUrl: z.string().optional(),
  temperature: z.coerce.number().min(0).max(2).optional(),
  maxTokens: z.coerce.number().positive().optional(),
});

export type AIModelConfig = z.infer<typeof AIModelConfigSchema>;

const AIModelsSchema = z.record(z.string(), AIModelConfigSchema);

const arrayField = (defaultValue: string[]) =>
  z.array(z.string()).default(defaultValue);

export const SystemConfigSchema = z.object({
  port: z.coerce.number().positive().default(3000),
  host: z.string().default('0.0.0.0'),
});

export type SystemConfig = z.infer<typeof SystemConfigSchema>;

export const DBConfigSchema = z.object({
  gitlab: z.object({
    url: z.string().default('https://gitlab.com'),
    token: z.string().default(''),
    webhookSecret: z.string().default(''),
  }).default({
    url: 'https://gitlab.com',
    token: '',
    webhookSecret: '',
  }),

  ai: z.object({
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

  log: z.object({
    level: z.string().optional().transform(s => {
      if (!s) return 'info';
      if (['trace', 'debug', 'info', 'warn', 'error'].includes(s)) {
        return s as 'trace' | 'debug' | 'info' | 'warn' | 'error';
      }
      return 'info';
    }),
  }).default({ level: 'info' }),

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

  copilot: z.object({
    refreshToken: z.string().default(''),
    accessToken: z.string().optional(),
    accessTokenExpiresAt: z.coerce.number().optional(),
    baseUrl: z.string().default('https://api.githubcopilot.com'),
    enterpriseUrl: z.string().optional(),
  }).default({
    refreshToken: '',
    baseUrl: 'https://api.githubcopilot.com',
  }),
});

export type DBConfig = z.infer<typeof DBConfigSchema>;

export type Language = DBConfig['review']['language'];
export type AIConfig = DBConfig['ai'];
export type GitLabConfig = DBConfig['gitlab'];
export type WebhookEventsConfig = DBConfig['webhook'];
export type ReviewConfig = DBConfig['review'];
export type QueueConfig = DBConfig['queue'];
export type CopilotConfig = DBConfig['copilot'];
