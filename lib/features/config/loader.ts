import { sql } from 'drizzle-orm';
import { getDb, settings } from '@/lib/db';
import { DBConfigSchema, type DBConfig } from './schema';
import { createLogger } from '@/lib/utils/logger';

const logger = createLogger('config-loader');

export async function getDBConfig(): Promise<DBConfig> {
  try {
    const db = await getDb();
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

export async function setDBConfig(
  grouped: Partial<DBConfig>
): Promise<void> {
  const db = await getDb();

  const categories = Object.keys(grouped);
  if (categories.length === 0) return;

  const now = new Date();
  const values = categories.map(category => ({
    key: category,
    value: JSON.stringify(grouped[category as keyof DBConfig]),
    createdAt: now,
    updatedAt: now,
  }));

  await db.insert(settings).values(values)
    .onConflictDoUpdate({
      target: settings.key,
      set: {
        value: sql.raw(`excluded.value`),
        updatedAt: now,
      },
    });
}
