'use server';

/**
 * Webhook 日志管理 Server Actions
 */

import { getDb } from '@/lib/db';
import { webhooks, reviews } from '@/lib/db/schema';
import { desc, eq, count, and } from 'drizzle-orm';
import type { GitLabWebhook } from '@/lib/webhooks/types';

/**
 * Webhook 与关联审查的信息
 */
export interface WebhookWithReview {
  id: number;
  objectKind: string;
  payload: GitLabWebhook;
  projectId: string | null;
  mrIid: number | null;
  processed: boolean;
  createdAt: Date;
  // 关联的审查信息
  review?: {
    id: number;
    status: string;
    triggeredBy: string;
    startedAt: Date | null;
    completedAt: Date | null;
  };
}

/**
 * 获取 Webhook 日志列表（支持分页）
 */
export async function getWebhooks(options?: {
  objectKind?: string;
  processed?: boolean;
  limit?: number;
  offset?: number;
}) {
  try {
    const db = getDb();
    const { objectKind, processed, limit = 50, offset = 0 } = options || {};

    // 构建查询条件
    const conditions = [];
    if (objectKind) {
      conditions.push(eq(webhooks.objectKind, objectKind));
    }
    if (processed !== undefined) {
      conditions.push(eq(webhooks.processed, processed));
    }

    const whereCondition = conditions.length > 0 ? and(...conditions) : undefined;

    // 执行主查询
    const itemsQuery = db
      .select()
      .from(webhooks)
      .orderBy(desc(webhooks.createdAt))
      .limit(limit)
      .offset(offset);

    const items = whereCondition
      ? await itemsQuery.where(whereCondition)
      : await itemsQuery;

    // 查询关联的审查信息
    const itemsWithReviews: WebhookWithReview[] = await Promise.all(
      items.map(async (webhook) => {
        // 查找由此 webhook 触发的审查
        const reviewList = await db
          .select()
          .from(reviews)
          .where(eq(reviews.webhookEventId, webhook.id))
          .limit(1);

        return {
          ...webhook,
          payload: webhook.payload as GitLabWebhook,
          review: reviewList[0] ? {
            id: reviewList[0].id,
            status: reviewList[0].status,
            triggeredBy: reviewList[0].triggeredBy,
            startedAt: reviewList[0].startedAt,
            completedAt: reviewList[0].completedAt,
          } : undefined,
        };
      })
    );

    // 执行计数查询
    const countQuery = db.select({ value: count() }).from(webhooks);
    const [{ value: total }] = whereCondition
      ? await countQuery.where(whereCondition)
      : await countQuery;

    return {
      success: true,
      data: itemsWithReviews,
      total,
      limit,
      offset,
    };
  } catch (error) {
    console.error('Failed to fetch webhook logs:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to fetch webhooks',
    };
  }
}

/**
 * 获取最近的 Webhook 日志（向后兼容）
 */
export async function getRecentWebhooks(limit = 50) {
  const result = await getWebhooks({ limit });
  return result.success ? result.data : [];
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
