import { z } from 'zod';

const AIProviderConfigSchema = z.object({
  apiKey: z.string().optional(),
  baseUrl: z.string().optional(),
  model: z.string(),
  temperature: z.coerce.number().min(0).max(2).default(0.3),
  maxTokens: z.coerce.number().positive().default(4000),
});

export type AIProviderConfig = z.infer<typeof AIProviderConfigSchema>;

const commaSeparated = (defaultValue: string[]) =>
  z.string()
    .optional()
    .transform(s => s ? s.split(',').map(x => x.trim()).filter(Boolean) : defaultValue);

const booleanString = (defaultValue: boolean) =>
  z.string()
    .optional()
    .transform(s => s === undefined ? defaultValue : (defaultValue ? s !== 'false' : s === 'true'));

export const AppConfigSchema = z.object({
  port: z.coerce.number().positive().default(3000),
  host: z.string().default('0.0.0.0'),

  gitlab: z.object({
    url: z.string(),
    token: z.string(),
    webhookSecret: z.string(),
  }),

  ai: z.object({
    'providers': z.string().transform(s => s.split(',').map(x => x.trim()).filter(Boolean)),
    'anthropic': AIProviderConfigSchema.extend({
      model: z.string().default('claude-sonnet-4-20250514'),
    }).optional(),
    'openai': AIProviderConfigSchema.extend({
      model: z.string().default('gpt-4o'),
    }).optional(),
    'github-copilot': AIProviderConfigSchema.extend({
      model: z.string().default('claude-sonnet-4'),
    }).optional(),
    'openai-compatible': AIProviderConfigSchema.optional(),
  }),

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
  }),

  review: z.object({
    maxFiles: z.coerce.number().positive().default(50),
    maxLinesPerFile: z.coerce.number().positive().default(1000),
    skipFiles: commaSeparated(['*.lock', 'package-lock.json', 'yarn.lock', 'pnpm-lock.yaml', 'bun.lockb', '*.min.js', '*.min.css']),
    inlineComments: booleanString(true),
    summaryComment: booleanString(true),
    language: z.enum(['zh', 'en']).default('en'),
  }),

  log: z.object({
    level: z.enum(['trace', 'debug', 'info', 'warn', 'error']),
  }).default({ level: 'info' }),
});

export type AppConfig = z.infer<typeof AppConfigSchema>;
export type AIConfig = AppConfig['ai'];
export type GitLabConfig = AppConfig['gitlab'];
export type WebhookEventsConfig = AppConfig['webhook'];
export type ReviewConfig = AppConfig['review'];
export type AIProviderType = keyof Omit<AppConfig['ai'], 'providers'>;
