import { eq } from 'drizzle-orm';
import { getDb, reviews } from '@/lib/db';
import type { ReviewEngine } from './engine';
import { createLogger } from '@/lib/utils/logger';

const logger = createLogger('review-scheduler');

export class ReviewScheduler {
  private isRunning = false;
  private timer: NodeJS.Timeout | null = null;

  constructor(
    private reviewEngine: ReviewEngine,
    private pollingIntervalMs: number = 5000
  ) {}

  async start(): Promise<void> {
    if (this.isRunning) return;
    this.isRunning = true;
    logger.info('Scheduler started');
    this.poll();
  }

  async stop(): Promise<void> {
    this.isRunning = false;
    if (this.timer) clearTimeout(this.timer);
    logger.info('Scheduler stopped');
  }

  private async poll(): Promise<void> {
    if (!this.isRunning) return;

    const db = await getDb();
    const pendingReviews = await db
      .select()
      .from(reviews)
      .where(eq(reviews.status, 'pending'))
      .orderBy(reviews.createdAt)
      .limit(10);

    for (const review of pendingReviews) {
      await this.processReview(review);
    }

    this.timer = setTimeout(
      () => this.poll(),
      this.isRunning && pendingReviews.length > 0 ? 0 : this.pollingIntervalMs
    );
  }

  private async processReview(review: typeof reviews.$inferSelect): Promise<void> {
    const db = await getDb();

    try {
      await db
        .update(reviews)
        .set({ status: 'running', startedAt: new Date(), updatedAt: new Date() })
        .where(eq(reviews.id, review.id));

      await this.reviewEngine.reviewMergeRequest({
        projectId: Number(review.projectId),
        mrIid: review.mrIid,
        reviewId: review.id,
        triggeredBy: review.triggeredBy,
        triggerEvent: review.triggerEvent ?? undefined,
        webhookEventId: review.webhookEventId ?? undefined,
      });
    } catch (error) {
      await db
        .update(reviews)
        .set({
          status: 'failed',
          lastErrorMessage: error instanceof Error ? error.message : String(error),
          updatedAt: new Date(),
        })
        .where(eq(reviews.id, review.id));
    }
  }

  isActive(): boolean {
    return this.isRunning;
  }
}
