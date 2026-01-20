'use server';

import { revalidateTag, revalidatePath } from 'next/cache';
import { getDb, settings, reviews, webhooks } from '@/lib/db';
import { getConfig, setConfigValue, setConfigValues, deleteConfigValue } from '@/lib/features/config';
import { createLogger } from '@/lib/utils/logger';

const logger = createLogger('settings-actions');

// ============================================================================
// Get Settings
// ============================================================================

export async function getAllSettings() {
  try {
    const config = await getConfig();
    const db = getDb();

    const allSettings = await db.select().from(settings);

    // 将数据库设置转换为扁平化对象
    const dbSettings: Record<string, unknown> = {};
    for (const setting of allSettings) {
      dbSettings[setting.key] = setting.value;
    }

    return {
      success: true,
      config, // 返回完整配置，包括 port 和 host
      dbSettings,
    };
  } catch (error) {
    logger.error({ error }, 'Failed to get settings');
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to get settings',
    };
  }
}

export async function getSetting(key: string) {
  try {
    const config = await getConfig();

    // 从配置中提取值
    const keys = key.split('.');
    let value: unknown = config as Record<string, unknown>;

    for (const k of keys) {
      if (value && typeof value === 'object' && k in value) {
        value = (value as Record<string, unknown>)[k];
      } else {
        value = undefined;
        break;
      }
    }

    return {
      success: true,
      key,
      value,
    };
  } catch (error) {
    logger.error({ error, key }, 'Failed to get setting');
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to get setting',
    };
  }
}

// ============================================================================
// Update Settings
// ============================================================================

export async function updateSetting(key: string, value: unknown) {
  try {
    await setConfigValue(key, value);

    // 刷新配置缓存
    revalidateTag('config', '');

    logger.info({ key }, 'Setting updated');

    return {
      success: true,
      message: 'Setting updated successfully',
    };
  } catch (error) {
    logger.error({ error, key }, 'Failed to update setting');
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to update setting',
    };
  }
}

export async function updateSettings(values: Record<string, unknown>) {
  try {
    await setConfigValues(values);

    // 刷新配置缓存
    revalidateTag('config', '');

    // 刷新设置页面
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

export async function deleteSetting(key: string) {
  try {
    await deleteConfigValue(key);

    // 刷新配置缓存
    revalidateTag('config', '');

    logger.info({ key }, 'Setting deleted');

    return {
      success: true,
      message: 'Setting deleted successfully',
    };
  } catch (error) {
    logger.error({ error, key }, 'Failed to delete setting');
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to delete setting',
    };
  }
}

// ============================================================================
// Reset Settings
// ============================================================================

export async function resetSettingsToDefaults() {
  try {
    const db = getDb();

    // 删除所有数据库设置
    await db.delete(settings);

    // 刷新配置缓存
    revalidateTag('config', '');

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

// ============================================================================
// Export Settings
// ============================================================================

export async function exportSettings() {
  try {
    const config = await getConfig();
    const db = getDb();

    const allSettings = await db.select().from(settings);

    // 将数据库设置转换为扁平化对象
    const dbSettings: Record<string, unknown> = {};
    for (const setting of allSettings) {
      dbSettings[setting.key] = setting.value;
    }

    return {
      success: true,
      data: {
        envConfig: config,
        dbSettings,
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

// ============================================================================
// Import Settings
// ============================================================================

export async function importSettings(dbSettings: Record<string, unknown>) {
  try {
    await setConfigValues(dbSettings);

    // 刷新配置缓存
    revalidateTag('config', '');

    logger.info({ keys: Object.keys(dbSettings) }, 'Settings imported');

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

// ============================================================================
// Clear Data
// ============================================================================

export async function clearReviewHistory() {
  try {
    const db = getDb();

    // 删除所有审查记录（级联删除相关数据）
    await db.delete(reviews);

    logger.info('Review history cleared');

    return {
      success: true,
      message: 'Review history cleared successfully',
    };
  } catch (error) {
    logger.error({ error }, 'Failed to clear review history');
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to clear review history',
    };
  }
}

export async function clearWebhookLogs() {
  try {
    const db = getDb();

    // 删除所有 webhook 日志
    await db.delete(webhooks);

    logger.info('Webhook logs cleared');

    return {
      success: true,
      message: 'Webhook logs cleared successfully',
    };
  } catch (error) {
    logger.error({ error }, 'Failed to clear webhook logs');
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to clear webhook logs',
    };
  }
}
