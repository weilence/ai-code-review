'use server';

import { eq, desc, count, and } from 'drizzle-orm';
import { getDb, reviews, reviewLogs } from '@/lib/db';
import { createLogger } from '@/lib/utils/logger';

const logger = createLogger('review-actions');

// ============================================================================
// Get Reviews
// ============================================================================

export async function getReviews(options?: {
  status?: 'pending' | 'running' | 'completed' | 'failed';
  limit?: number;
  offset?: number;
}) {
  try {
    const db = getDb();
    const { status, limit = 50, offset = 0 } = options || {};

    // 构建查询条件
    const whereCondition = status ? eq(reviews.status, status) : undefined;

    // 执行主查询
    const itemsQuery = db
      .select()
      .from(reviews)
      .orderBy(desc(reviews.createdAt))
      .limit(limit)
      .offset(offset);

    const items = whereCondition
      ? await itemsQuery.where(whereCondition)
      : await itemsQuery;

    // 执行计数查询
    const countQuery = db.select({ value: count() }).from(reviews);
    const [{ value: total }] = whereCondition
      ? await countQuery.where(whereCondition)
      : await countQuery;

    return {
      success: true,
      data: items,
      total,
      limit,
      offset,
    };
  } catch (error) {
    logger.error({ error }, 'Failed to get reviews');
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to get reviews',
    };
  }
}

export async function getReview(id: number) {
  try {
    const db = getDb();

    const review = await db.select().from(reviews).where(eq(reviews.id, id)).limit(1);

    if (review.length === 0) {
      return {
        success: false,
        error: 'Review not found',
      };
    }

    return {
      success: true,
      data: review[0],
    };
  } catch (error) {
    logger.error({ error, id }, 'Failed to get review');
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to get review',
    };
  }
}

export async function getReviewByMr(projectId: string, mrIid: number) {
  try {
    const db = getDb();

    const review = await db
      .select()
      .from(reviews)
      .where(and(eq(reviews.projectId, projectId), eq(reviews.mrIid, mrIid)))
      .orderBy(desc(reviews.createdAt))
      .limit(1);

    return {
      success: true,
      data: review[0] || null,
    };
  } catch (error) {
    logger.error({ error, projectId, mrIid }, 'Failed to get review by MR');
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to get review by MR',
    };
  }
}

// ============================================================================
// Get Review Logs
// ============================================================================

export async function getReviewLogs(reviewId: number) {
  try {
    const db = getDb();

    const logs = await db
      .select()
      .from(reviewLogs)
      .where(eq(reviewLogs.reviewId, reviewId))
      .orderBy(desc(reviewLogs.createdAt));

    return {
      success: true,
      data: logs,
    };
  } catch (error) {
    logger.error({ error, reviewId }, 'Failed to get review logs');
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to get review logs',
    };
  }
}

// ============================================================================
// Legacy Helper Functions (向后兼容)
// ============================================================================

/**
 * 获取最新的审查结果（向后兼容）
 * @deprecated 使用 getReviewLogs 代替
 */
export async function getReviewResults(reviewId: number) {
  const result = await getReviewLogs(reviewId);

  if (!result.success || !result.data) {
    return {
      success: result.success,
      error: result.error,
      data: null,
    };
  }

  // 找到最新的 result 类型日志
  const latestResult = result.data.find(log => log.logType === 'result');

  return {
    success: true,
    data: latestResult || null,
  };
}

/**
 * 获取审查错误列表（向后兼容）
 * @deprecated 使用 getReviewLogs 代替
 */
export async function getReviewErrors(reviewId: number) {
  const result = await getReviewLogs(reviewId);

  if (!result.success || !result.data) {
    return {
      success: result.success,
      error: result.error,
      data: [],
    };
  }

  // 过滤出所有 error 类型日志
  const errors = result.data.filter(log => log.logType === 'error');

  return {
    success: true,
    data: errors,
  };
}

// ============================================================================
// Trigger Manual Review
// ============================================================================

export async function triggerManualReview(projectId: number, mrIid: number) {
  try {
    logger.info({ projectId, mrIid }, 'Triggering manual review');

    // Use queue system
    const { getQueueManager } = await import('@/lib/features/queue/singleton');
    const { GitLabClient } = await import('@/lib/features/gitlab/client');
    const { getDBConfig } = await import('@/lib/features/config');

    const queueManager = await getQueueManager();
    const config = await getDBConfig();

    // Get MR information from GitLab
    const gitlabClient = new GitLabClient(config.gitlab);
    const mrChanges = await gitlabClient.getMergeRequestChanges(
      projectId,
      mrIid
    );

    // Enqueue task
    const taskId = await queueManager.enqueue({
      projectId,
      mrIid,
      projectPath: mrChanges.webUrl.split('/').slice(3, 5).join('/'),
      mrTitle: mrChanges.title,
      mrAuthor: mrChanges.author.username,
      mrDescription: mrChanges.description || undefined,
      sourceBranch: mrChanges.sourceBranch,
      targetBranch: mrChanges.targetBranch,
      triggeredBy: 'manual',
      priority: 3, // Higher priority for manual triggers
    });

    return {
      success: true,
      data: { taskId },
      message: '审查任务已加入队列',
    };
  } catch (error) {
    logger.error({ error, projectId, mrIid }, 'Failed to trigger manual review');
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to trigger review',
    };
  }
}

// ============================================================================
// Retry Failed Review
// ============================================================================

export async function retryReview(reviewId: number) {
  try {
    const db = getDb();

    const review = await db.select().from(reviews).where(eq(reviews.id, reviewId)).limit(1);

    if (review.length === 0) {
      return {
        success: false,
        error: 'Review not found',
      };
    }

    const reviewData = review[0];

    if (reviewData.status !== 'failed') {
      return {
        success: false,
        error: 'Only failed reviews can be retried',
      };
    }

    logger.info({ reviewId }, 'Retrying failed review');

    // Use queue system
    const { getQueueManager } = await import('@/lib/features/queue/singleton');
    const queueManager = await getQueueManager();

    // Enqueue as a retry task
    const taskId = await queueManager.enqueue({
      projectId: Number(reviewData.projectId),
      mrIid: reviewData.mrIid,
      projectPath: reviewData.projectPath,
      mrTitle: reviewData.mrTitle,
      mrAuthor: reviewData.mrAuthor,
      mrDescription: reviewData.mrDescription || undefined,
      sourceBranch: reviewData.sourceBranch,
      targetBranch: reviewData.targetBranch,
      triggeredBy: 'manual',
      priority: 1, // Highest priority for retries
    });

    // 立即返回成功
    return {
      success: true,
      data: { taskId },
      message: '审查重试任务已加入队列',
    };
  } catch (error) {
    logger.error({ error, reviewId }, 'Failed to start review retry');
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to start review retry',
    };
  }
}

// ============================================================================
// Get Review Statistics
// ============================================================================

export async function getReviewStatistics() {
  try {
    const db = getDb();

    const stats = await db
      .select({
        status: reviews.status,
        count: count(),
      })
      .from(reviews)
      .groupBy(reviews.status);

    const totalByStatus: Record<string, number> = {};
    for (const stat of stats) {
      totalByStatus[stat.status] = stat.count;
    }

    const [{ value: totalReviews }] = await db.select({ value: count() }).from(reviews);

    const completedReviews = totalByStatus['completed'] || 0;
    const successRate = totalReviews > 0 ? (completedReviews / totalReviews) * 100 : 0;

    // 获取最近的审查
    const recentReviews = await db
      .select()
      .from(reviews)
      .orderBy(desc(reviews.createdAt))
      .limit(5);

    return {
      success: true,
      data: {
        totalReviews,
        byStatus: totalByStatus,
        successRate: Math.round(successRate * 100) / 100,
        recentReviews,
      },
    };
  } catch (error) {
    logger.error({ error }, 'Failed to get review statistics');
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to get review statistics',
    };
  }
}

// ============================================================================
// Delete Review
// ============================================================================

export async function deleteReview(id: number) {
  try {
    const db = getDb();

    await db.delete(reviews).where(eq(reviews.id, id));

    logger.info({ id }, 'Review deleted');

    return {
      success: true,
      message: 'Review deleted successfully',
    };
  } catch (error) {
    logger.error({ error, id }, 'Failed to delete review');
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to delete review',
    };
  }
}

export async function clearAllReviews() {
  try {
    const db = getDb();

    await db.delete(reviews);

    logger.info('All reviews cleared');

    return {
      success: true,
      message: 'All reviews cleared successfully',
    };
  } catch (error) {
    logger.error({ error }, 'Failed to clear all reviews');
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to clear all reviews',
    };
  }
}
