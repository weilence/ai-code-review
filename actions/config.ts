'use server';

import { revalidatePath } from 'next/cache';
import { getDb, settings } from '@/lib/db';
import { getDBConfig, setDBConfig } from '@/lib/features/config';
import { createLogger } from '@/lib/utils/logger';
import type { DBConfig } from '@/lib/features/config/schema';

const logger = createLogger('settings-actions');

export async function getAllSettings() {
  try {
    const config = await getDBConfig();

    return {
      success: true,
      config,
      dbSettings: config,
    };
  } catch (error) {
    logger.error({ error }, 'Failed to get settings');
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to get settings',
    };
  }
}

export async function updateSettings(values: Partial<DBConfig>) {
  try {
    await setDBConfig(values);

    revalidatePath('/settings');

    logger.info({ keys: Object.keys(values) }, 'Settings updated successfully');

    return {
      success: true,
      message: 'Settings updated successfully',
    };
  } catch (error) {
    logger.error({ error }, 'Failed to update settings');
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to update settings',
    };
  }
}

export async function resetSettingsToDefaults() {
  try {
    const db = await getDb();

    await db.delete(settings);

    logger.info('Settings reset to defaults');

    return {
      success: true,
      message: 'Settings reset to defaults successfully',
    };
  } catch (error) {
    logger.error({ error }, 'Failed to reset settings');
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to reset settings',
    };
  }
}

export async function exportSettings() {
  try {
    const config = await getDBConfig();

    return {
      success: true,
      data: {
        dbConfig: config,
        version: '2.0',
        exportedAt: new Date().toISOString(),
      },
    };
  } catch (error) {
    logger.error({ error }, 'Failed to export settings');
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to export settings',
    };
  }
}

export async function importSettings(data: Record<string, unknown>) {
  try {
    await setDBConfig(data as Partial<DBConfig>);

    logger.info({ keys: Object.keys(data) }, 'Settings imported');

    return {
      success: true,
      message: 'Settings imported successfully',
    };
  } catch (error) {
    logger.error({ error }, 'Failed to import settings');
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to import settings',
    };
  }
}
