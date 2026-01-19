import { unstable_cache } from 'next/cache';
import { eq } from 'drizzle-orm';
import { getDb, settings } from '@/lib/db';
import { AppConfigSchema, type AppConfig } from './schema';

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * 从环境变量加载配置（Next.js 风格）
 * 支持 GITLAB__URL、GITLAB__TOKEN 等格式
 */
export function loadConfigFromEnv(): AppConfig {
  const envConfig: Record<string, unknown> = {
    port: process.env.PORT,
    host: process.env.HOST,
    gitlab: {
      url: process.env.GITLAB_URL,
      token: process.env.GITLAB_TOKEN,
      webhookSecret: process.env.GITLAB_WEBHOOK_SECRET,
    },
    ai: {
      models: process.env.AI_MODELS,
      provider: process.env.AI_PROVIDER,
      temperature: process.env.AI_TEMPERATURE,
      maxTokens: process.env.AI_MAX_TOKENS,
      anthropic: {
        apiKey: process.env.ANTHROPIC_API_KEY,
        baseUrl: process.env.ANTHROPIC_BASE_URL,
      },
      openai: {
        apiKey: process.env.OPENAI_API_KEY,
        baseUrl: process.env.OPENAI_BASE_URL,
      },
      'github-copilot': {
        apiKey: process.env.GITHUB_COPILOT_API_KEY,
        baseUrl: process.env.GITHUB_COPILOT_BASE_URL,
      },
      'openai-compatible': {
        apiKey: process.env.OPENAI_COMPATIBLE_API_KEY,
        baseUrl: process.env.OPENAI_COMPATIBLE_BASE_URL,
      },
    },
    webhook: {
      mr: {
        enabled: process.env.WEBHOOK_MR_ENABLED,
        events: process.env.WEBHOOK_MR_EVENTS,
        reviewDrafts: process.env.WEBHOOK_MR_REVIEW_DRAFTS,
      },
      push: {
        enabled: process.env.WEBHOOK_PUSH_ENABLED,
        branches: process.env.WEBHOOK_PUSH_BRANCHES,
      },
      note: {
        enabled: process.env.WEBHOOK_NOTE_ENABLED,
        commands: process.env.WEBHOOK_NOTE_COMMANDS,
      },
    },
    review: {
      maxFiles: process.env.REVIEW_MAX_FILES,
      maxLinesPerFile: process.env.REVIEW_MAX_LINES_PER_FILE,
      skipFiles: process.env.REVIEW_SKIP_FILES,
      inlineComments: process.env.REVIEW_INLINE_COMMENTS,
      summaryComment: process.env.REVIEW_SUMMARY_COMMENT,
      language: process.env.REVIEW_LANGUAGE,
      failureBehavior: process.env.REVIEW_FAILURE_BEHAVIOR,
      failureThreshold: process.env.REVIEW_FAILURE_THRESHOLD,
    },
    log: {
      level: process.env.LOG_LEVEL,
    },
  };

  return AppConfigSchema.parse(envConfig);
}

// ============================================================================
// Database Config Functions
// ============================================================================

/**
 * 从数据库加载所有配置（扁平化）
 */
export async function loadConfigFromDB(): Promise<Record<string, unknown>> {
  try {
    const db = getDb();
    const allSettings = await db.select().from(settings);

    const flatConfig: Record<string, unknown> = {};

    for (const setting of allSettings) {
      flatConfig[setting.key] = setting.value;
    }

    return flatConfig;
  } catch (error) {
    console.error('Failed to load config from database:', error);
    return {};
  }
}

/**
 * 将嵌套配置对象扁平化
 */
export function flattenConfig(obj: Record<string, unknown>, prefix = ''): Record<string, unknown> {
  const result: Record<string, unknown> = {};

  for (const [key, value] of Object.entries(obj)) {
    const fullKey = prefix ? `${prefix}.${key}` : key;

    if (value !== null && typeof value === 'object' && !Array.isArray(value)) {
      Object.assign(result, flattenConfig(value as Record<string, unknown>, fullKey));
    } else {
      result[fullKey] = value;
    }
  }

  return result;
}

/**
 * 将扁平化配置转换为嵌套对象
 */
function unflattenConfig(flat: Record<string, unknown>): Record<string, unknown> {
  const result: Record<string, unknown> = {};

  for (const [key, value] of Object.entries(flat)) {
    const parts = key.split('.');
    if (parts.length === 0) continue;

    let current = result;

    for (let i = 0; i < parts.length - 1; i++) {
      const part = parts[i];
      if (!part) continue;

      if (!current[part] || typeof current[part] !== 'object') {
        current[part] = {};
      }
      current = current[part] as Record<string, unknown>;
    }

    const lastPart = parts[parts.length - 1];
    if (lastPart) {
      current[lastPart] = value;
    }
  }

  return result;
}

/**
 * 合并数据库配置和环境变量配置
 * 数据库配置优先
 */
export function mergeConfig(dbConfig: Record<string, unknown>, envConfig: AppConfig): AppConfig {
  const flatEnvConfig = flattenConfig(envConfig);
  const merged: Record<string, unknown> = { ...flatEnvConfig };

  for (const [key, value] of Object.entries(dbConfig)) {
    merged[key] = value;
  }

  return unflattenConfig(merged) as AppConfig;
}

// ============================================================================
// Cached Config Loading
// ============================================================================

/**
 * 缓存的配置加载函数
 * 使用 Next.js unstable_cache 实现
 */
export const getCachedConfig = unstable_cache(
  async (): Promise<AppConfig> => {
    const envConfig = loadConfigFromEnv();
    const dbConfig = await loadConfigFromDB();
    const merged = mergeConfig(dbConfig, envConfig);
    // 不需要再次验证，因为 envConfig 已经通过了验证
    return merged as AppConfig;
  },
  ['app-config'],
  { revalidate: 60, tags: ['config'] }
);

/**
 * 获取当前配置
 */
export async function getConfig(): Promise<AppConfig> {
  return getCachedConfig();
}

/**
 * 刷新配置缓存
 * 通过 revalidateTag 实现
 */
export async function refreshConfig(): Promise<void> {
  const { revalidateTag } = await import('next/cache');
  revalidateTag('config', 'force-cache');
}

// ============================================================================
// Single Config Value Operations
// ============================================================================

/**
 * 设置单个配置值到数据库
 */
export async function setConfigValue(key: string, value: unknown): Promise<void> {
  const db = getDb();

  await db.insert(settings).values({ key, value: value as unknown[] })
    .onConflictDoUpdate({
      target: settings.key,
      set: { value: value as unknown[], updatedAt: new Date() },
    });

  // 刷新缓存
  await refreshConfig();
}

/**
 * 获取单个配置值
 */
export async function getConfigValue<T = unknown>(key: string): Promise<T | null> {
  const config = await getConfig();
  const flatConfig = flattenConfig(config);
  return (flatConfig[key] as T) ?? null;
}

/**
 * 批量设置配置值
 */
export async function setConfigValues(values: Record<string, unknown>): Promise<void> {
  const db = getDb();

  for (const [key, value] of Object.entries(values)) {
    await db.insert(settings).values({ key, value: value as unknown[] })
      .onConflictDoUpdate({
        target: settings.key,
        set: { value: value as unknown[], updatedAt: new Date() },
      });
  }

  // 刷新缓存
  await refreshConfig();
}

/**
 * 删除配置值
 */
export async function deleteConfigValue(key: string): Promise<void> {
  const db = getDb();
  await db.delete(settings).where(eq(settings.key, key));

  // 刷新缓存
  await refreshConfig();
}
