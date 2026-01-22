'use server';

import { eq, desc, count, and } from 'drizzle-orm';
import { getDb, reviews, reviewResults, reviewErrors } from '@/lib/db';
import { getReviewEngine } from '@/lib/services';
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
// Get Review Results
// ============================================================================

export async function getReviewResults(reviewId: number) {
  try {
    const db = getDb();

    const results = await db
      .select()
      .from(reviewResults)
      .where(eq(reviewResults.reviewId, reviewId))
      .limit(1);

    return {
      success: true,
      data: results[0] || null,
    };
  } catch (error) {
    logger.error({ error, reviewId }, 'Failed to get review results');
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to get review results',
    };
  }
}

export async function getReviewErrors(reviewId: number) {
  try {
    const db = getDb();

    const errors = await db
      .select()
      .from(reviewErrors)
      .where(eq(reviewErrors.reviewId, reviewId))
      .orderBy(desc(reviewErrors.createdAt));

    return {
      success: true,
      data: errors,
    };
  } catch (error) {
    logger.error({ error, reviewId }, 'Failed to get review errors');
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to get review errors',
    };
  }
}

// ============================================================================
// Trigger Manual Review
// ============================================================================

export async function triggerManualReview(projectId: number, mrIid: number) {
  try {
    logger.info({ projectId, mrIid }, 'Triggering manual review');

    const reviewEngine = await getReviewEngine();

    const result = await reviewEngine.reviewMergeRequest({
      projectId,
      mrIid,
      triggeredBy: 'manual',
    });

    return {
      success: true,
      data: {
        inlineCommentsPosted: result.inlineCommentsPosted,
        summaryPosted: result.summaryPosted,
        errors: result.errors,
      },
      message: 'Review triggered successfully',
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

    const reviewEngine = await getReviewEngine();

    const result = await reviewEngine.reviewMergeRequest({
      projectId: Number(reviewData.projectId),
      mrIid: reviewData.mrIid,
      triggeredBy: 'manual',
    });

    return {
      success: true,
      data: {
        inlineCommentsPosted: result.inlineCommentsPosted,
        summaryPosted: result.summaryPosted,
        errors: result.errors,
      },
      message: 'Review retried successfully',
    };
  } catch (error) {
    logger.error({ error, reviewId }, 'Failed to retry review');
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to retry review',
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
