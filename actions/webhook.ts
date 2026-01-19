'use server';

/**
 * Webhook 日志管理 Server Actions
 */

import { getDb } from '@/lib/db';
import { webhooks } from '@/lib/db/schema';
import { desc, eq } from 'drizzle-orm';

/**
 * 获取最近的 Webhook 日志
 */
export async function getRecentWebhooks(limit = 50) {
  try {
    const db = getDb();
    const logs = await db
      .select()
      .from(webhooks)
      .orderBy(desc(webhooks.createdAt))
      .limit(limit);

    return logs;
  } catch (error) {
    console.error('Failed to fetch webhook logs:', error);
    return [];
  }
}

/**
 * 获取单个 Webhook 日志详情
 */
export async function getWebhookById(id: number) {
  try {
    const db = getDb();
    const logs = await db
      .select()
      .from(webhooks)
      .where(eq(webhooks.id, id))
      .limit(1);

    return logs[0] || null;
  } catch (error) {
    console.error('Failed to fetch webhook log:', error);
    return null;
  }
}
