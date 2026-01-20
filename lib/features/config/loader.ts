import { unstable_cache } from 'next/cache';
import { eq } from 'drizzle-orm';
import { getDb, settings } from '@/lib/db';
import { AppConfigSchema, type AppConfig } from './schema';

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * 从环境变量加载系统级配置
 * 只有 port、host 等启动时配置从环境变量读取
 * 业务配置（GitLab、AI、Review 等）从数据库读取
 */
export function loadSystemConfigFromEnv(): Partial<AppConfig> {
  return {
    port: process.env.PORT ? Number(process.env.PORT) : undefined,
    host: process.env.HOST,
  };
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
 * 合并数据库配置和系统环境变量配置
 * 系统级配置（port、host）从环境变量读取
 * 业务配置从数据库读取
 */
export function mergeConfig(dbConfig: Record<string, unknown>, systemConfig: Partial<AppConfig>): AppConfig {
  // 将扁平化的数据库配置转换为嵌套结构
  const nestedDbConfig = unflattenConfig(dbConfig);

  // 合并配置
  const merged: Record<string, unknown> = {
    ...nestedDbConfig,
    ...systemConfig,
  };

  // 使用 schema 验证并填充默认值
  return AppConfigSchema.parse(merged);
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
    const systemConfig = loadSystemConfigFromEnv();
    const dbConfig = await loadConfigFromDB();
    const merged = mergeConfig(dbConfig, systemConfig);
    return merged;
  },
  ['app-config'],
  { tags: ['config'] }
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
  revalidateTag('config', '');
}

// ============================================================================
// Single Config Value Operations
// ============================================================================

/**
 * 设置单个配置值到数据库
 */
export async function setConfigValue(key: string, value: unknown): Promise<void> {
  const db = getDb();

  // 将值转换为字符串存储（让 Zod schema 负责转换回原始类型）
  const stringValue = typeof value === 'string' ? value : JSON.stringify(value);

  await db.insert(settings).values({ key, value: stringValue })
    .onConflictDoUpdate({
      target: settings.key,
      set: { value: stringValue, updatedAt: new Date() },
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
    // 将值转换为字符串存储（让 Zod schema 负责转换回原始类型）
    const stringValue = typeof value === 'string' ? value : JSON.stringify(value);

    await db.insert(settings).values({ key, value: stringValue })
      .onConflictDoUpdate({
        target: settings.key,
        set: { value: stringValue, updatedAt: new Date() },
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
