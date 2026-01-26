import { sql } from 'drizzle-orm';
import { getDb, settings } from '@/lib/db';
import { DBConfigSchema, type DBConfig } from './schema';
import { createLogger } from '@/lib/utils/logger';

const logger = createLogger('config-loader');

// ============================================================================
// Config Operations
// ============================================================================

/**
 * 获取数据库配置
 * 每次调用时从数据库重新加载，不使用缓存
 */
export async function getDBConfig(): Promise<DBConfig> {
  try {
    const db = getDb();
    const allSettings = await db.select().from(settings);

    const groupedConfig: Record<string, unknown> = {};
    for (const setting of allSettings) {
      try {
        groupedConfig[setting.key] = JSON.parse(setting.value);
      } catch (error) {
        logger.warn({ key: setting.key, error }, 'Failed to parse config value');
        groupedConfig[setting.key] = setting.value;
      }
    }

    return DBConfigSchema.parse(groupedConfig);
  } catch (error) {
    logger.error({ error }, 'Failed to load config from database');
    return DBConfigSchema.parse({});
  }
}

/**
 * 设置数据库配置
 * 使用批量插入 + onConflictDoUpdate 实现批量更新
 */
export async function setDBConfig(
  grouped: Partial<DBConfig>
): Promise<void> {
  const db = getDb();

  const categories = Object.keys(grouped);
  if (categories.length === 0) return;

  const now = new Date();
  const values = categories.map(category => ({
    key: category,
    value: JSON.stringify(grouped[category as keyof DBConfig]),
    createdAt: now,
    updatedAt: now,
  }));

  // 批量插入，如果 key 冲突则更新
  await db.insert(settings).values(values)
    .onConflictDoUpdate({
      target: settings.key,
      set: {
        value: sql.raw(`excluded.value`),
        updatedAt: now,
      },
    });
}
