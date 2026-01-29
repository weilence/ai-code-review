'use server';

import { eq, desc, count, and } from 'drizzle-orm';
import { getDb, reviews, reviewLogs } from '@/lib/db';
import { createLogger } from '@/lib/utils/logger';

const logger = createLogger('review-actions');

export async function getReviews(options?: {
  status?: 'pending' | 'running' | 'completed' | 'failed';
  limit?: number;
  offset?: number;
}) {
  try {
    const db = await getDb();
    const { status, limit = 50, offset = 0 } = options || {};

    const whereCondition = status ? eq(reviews.status, status) : undefined;

    const itemsQuery = db
      .select()
      .from(reviews)
      .orderBy(desc(reviews.createdAt))
      .limit(limit)
      .offset(offset);

    const items = whereCondition
      ? await itemsQuery.where(whereCondition)
      : await itemsQuery;

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
    const db = await getDb();

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
    const db = await getDb();

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

export async function getReviewLogs(reviewId: number) {
  try {
    const db = await getDb();

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

export async function getReviewResults(reviewId: number) {
  const result = await getReviewLogs(reviewId);

  if (!result.success || !result.data) {
    return {
      success: result.success,
      error: result.error,
      data: null,
    };
  }

  const latestResult = result.data.find(log => log.logType === 'result');

  return {
    success: true,
    data: latestResult || null,
  };
}

export async function getReviewErrors(reviewId: number) {
  const result = await getReviewLogs(reviewId);

  if (!result.success || !result.data) {
    return {
      success: result.success,
      error: result.error,
      data: [],
    };
  }

  const errors = result.data.filter(log => log.logType === 'error');

  return {
    success: true,
    data: errors,
  };
}

export async function triggerManualReview(projectId: number, mrIid: number) {
  try {
    logger.info({ projectId, mrIid }, 'Triggering manual review');

    const { getQueueManager } = await import('@/lib/features/queue/singleton');
    const { GitLabClient } = await import('@/lib/features/gitlab/client');
    const { getDBConfig } = await import('@/lib/features/config');

    const queueManager = await getQueueManager();
    const config = await getDBConfig();

    const gitlabClient = new GitLabClient(config.gitlab);
    const mrChanges = await gitlabClient.getMergeRequestChanges(
      projectId,
      mrIid
    );

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
      priority: 3,
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

export async function retryReview(reviewId: number) {
  try {
    const db = await getDb();

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

    const { getQueueManager } = await import('@/lib/features/queue/singleton');
    const queueManager = await getQueueManager();

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
      priority: 1,
      reviewId, // 关联原有 review 记录
    });

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

export async function getReviewStatistics() {
  try {
    const db = await getDb();

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

export async function deleteReview(id: number) {
  try {
    const db = await getDb();

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
    const db = await getDb();

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
