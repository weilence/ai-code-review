import { z } from 'zod';

// ============================================================================
// AI Provider Config
// ============================================================================

const AIProviderConfigSchema = z.object({
  apiKey: z.string().optional(),
  baseUrl: z.string().optional(),
});

export type AIProviderConfig = z.infer<typeof AIProviderConfigSchema>;

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
    models: z.string().default('anthropic:claude-sonnet-4-5').transform(s => s.split(',').map(x => x.trim()).filter(Boolean)),
    provider: z.string().optional(),
    temperature: z.coerce.number().optional(),
    maxTokens: z.coerce.number().positive().optional(),
    anthropic: AIProviderConfigSchema.optional(),
    openai: AIProviderConfigSchema.optional(),
    'github-copilot': AIProviderConfigSchema.optional(),
    'openai-compatible': AIProviderConfigSchema.optional(),
  }).default({
    models: ['anthropic:claude-sonnet-4-5'],
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
});

export type AppConfig = z.infer<typeof AppConfigSchema>;
export type Language = AppConfig['review']['language'];
export type AIConfig = AppConfig['ai'];
export type GitLabConfig = AppConfig['gitlab'];
export type WebhookEventsConfig = AppConfig['webhook'];
export type ReviewConfig = AppConfig['review'];
