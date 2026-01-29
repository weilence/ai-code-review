import { eq, and, sql, count } from 'drizzle-orm';
import { getDb, reviewQueue, type QueueTask, type NewQueueTask } from '@/lib/db';
import type { EnqueueOptions } from './schema';
import { createLogger } from '@/lib/utils/logger';

const logger = createLogger('task-queue');

export class TaskQueue {
  async enqueue(options: EnqueueOptions): Promise<number> {
    const db = await getDb();
    const projectId = String(options.projectId);

    const existing = await db
      .select()
      .from(reviewQueue)
      .where(
        and(
          eq(reviewQueue.projectId, projectId),
          eq(reviewQueue.mrIid, options.mrIid),
          eq(reviewQueue.status, 'pending')
        )
      )
      .limit(1);

    if (existing.length > 0) {
      logger.info(
        { taskId: existing[0].id, projectId, mrIid: options.mrIid },
        'Task already pending, returning existing ID'
      );
      return existing[0].id;
    }

    const now = new Date();
    const newTask: NewQueueTask = {
      projectId,
      mrIid: options.mrIid,
      projectPath: options.projectPath || '',
      mrTitle: options.mrTitle || '',
      mrAuthor: options.mrAuthor || '',
      mrDescription: options.mrDescription,
      sourceBranch: options.sourceBranch || '',
      targetBranch: options.targetBranch || '',
      status: 'pending',
      priority: options.priority || 5,
      scheduledAt: options.scheduledAt,
      triggeredBy: options.triggeredBy,
      triggerEvent: options.triggerEvent,
      webhookEventId: options.webhookEventId,
      reviewId: options.reviewId,
      createdAt: now,
      updatedAt: now,
    };

    const [task] = await db.insert(reviewQueue).values(newTask).returning();

    logger.info(
      { taskId: task.id, projectId, mrIid: options.mrIid, priority: task.priority },
      'Task enqueued successfully'
    );

    return task.id;
  }

  async dequeue(workerId: string): Promise<QueueTask | null> {
    const db = await getDb();
    const now = Date.now();

    try {
      const tasks = await db
        .select()
        .from(reviewQueue)
        .where(eq(reviewQueue.status, 'pending'))
        .orderBy(reviewQueue.priority, reviewQueue.createdAt)
        .limit(1);

      if (!tasks || tasks.length === 0) {
        return null;
      }

      const task = tasks[0];

      await db
        .update(reviewQueue)
        .set({
          status: 'running',
          lockedAt: new Date(now),
          lockedBy: workerId,
          updatedAt: new Date(now),
        })
        .where(eq(reviewQueue.id, task.id));

      logger.debug(
        { taskId: task.id, projectId: task.projectId, mrIid: task.mrIid, workerId },
        'Task dequeued successfully'
      );

      return task;
    } catch (error) {
      logger.error({ error, workerId }, 'Failed to dequeue task');
      throw error;
    }
  }

  async releaseLock(taskId: number, workerId: string): Promise<void> {
    const db = await getDb();
    await db
      .update(reviewQueue)
      .set({
        status: 'pending',
        lockedAt: null,
        lockedBy: null,
        updatedAt: new Date(),
      })
      .where(eq(reviewQueue.id, taskId));

    logger.info({ taskId, workerId }, 'Task lock released');
  }

  async cancelTask(taskId: number): Promise<boolean> {
    const db = await getDb();
    await db
      .update(reviewQueue)
      .set({
        status: 'cancelled',
        updatedAt: new Date(),
      })
      .where(and(eq(reviewQueue.id, taskId), eq(reviewQueue.status, 'pending')));

    logger.info({ taskId }, 'Task cancelled');
    return true;
  }

  async markCompleted(taskId: number, reviewId: number, durationMs: number): Promise<void> {
    const db = await getDb();
    await db
      .update(reviewQueue)
      .set({
        status: 'completed',
        reviewId,
        updatedAt: new Date(),
      })
      .where(eq(reviewQueue.id, taskId));

    logger.info({ taskId, reviewId, durationMs }, 'Task marked as completed');
  }

  async markFailed(
    taskId: number,
    error: Error,
    nextRetryAt?: Date
  ): Promise<void> {
    type UpdateData = {
      lastErrorType: string;
      lastErrorMessage: string;
      updatedAt: Date;
      status?: 'pending' | 'failed';
      nextRetryAt?: Date;
      lockedAt?: Date | null;
      lockedBy?: string | null;
    };

    const updateData: UpdateData = {
      lastErrorType: error.constructor.name,
      lastErrorMessage: error.message,
      updatedAt: new Date(),
    };

    if (nextRetryAt) {
      updateData.status = 'pending';
      updateData.nextRetryAt = nextRetryAt;
      updateData.lockedAt = null;
      updateData.lockedBy = null;
    } else {
      updateData.status = 'failed';
    }

    const db = await getDb();
    await db.update(reviewQueue).set(updateData).where(eq(reviewQueue.id, taskId));

    logger.info(
      { taskId, errorType: error.constructor.name, nextRetryAt },
      nextRetryAt ? 'Task scheduled for retry' : 'Task marked as permanently failed'
    );
  }

  async getPendingCount(): Promise<number> {
    const db = await getDb();
    const [result] = await db
      .select({ value: count() })
      .from(reviewQueue)
      .where(eq(reviewQueue.status, 'pending'));

    return result?.value || 0;
  }

  async getStuckTasks(timeoutMs: number): Promise<QueueTask[]> {
    const db = await getDb();
    const timeoutThreshold = Date.now() - timeoutMs;

    return await db
      .select()
      .from(reviewQueue)
      .where(
        and(
          eq(reviewQueue.status, 'running'),
          sql`${reviewQueue.lockedAt} < ${timeoutThreshold}`
        )
      );
  }

  async requeueStuckTasks(timeoutMs: number): Promise<number> {
    const db = await getDb();
    const timeoutThreshold = Date.now() - timeoutMs;

    await db
      .update(reviewQueue)
      .set({
        status: 'pending',
        lockedAt: null,
        lockedBy: null,
        updatedAt: new Date(),
      })
      .where(
        and(
          eq(reviewQueue.status, 'running'),
          sql`${reviewQueue.lockedAt} < ${timeoutThreshold}`
        )
      );

  const stuckTasks = await this.getStuckTasks(timeoutMs);
  const count = stuckTasks.length;

    logger.info({ count }, 'Stuck tasks requeued');
    return count;
  }

  async cleanupOldTasks(retainDays: number): Promise<number> {
    const db = await getDb();
    const cutoffDate = new Date(Date.now() - retainDays * 24 * 60 * 60 * 1000);

    const tasksToDelete = await db
      .select()
      .from(reviewQueue)
      .where(
        and(
          eq(reviewQueue.status, 'completed'),
          sql`${reviewQueue.updatedAt} < ${cutoffDate.getTime()}`
        )
      );

    const count = tasksToDelete.length;

    await db
      .delete(reviewQueue)
      .where(
        and(
          eq(reviewQueue.status, 'completed'),
          sql`${reviewQueue.updatedAt} < ${cutoffDate.getTime()}`
        )
      );

    logger.info({ count, retainDays }, 'Old tasks cleaned up');
    return count;
  }

  async getStats(): Promise<{ pending: number; running: number; completed: number; failed: number }> {
    const db = await getDb();
    const stats = await db
      .select({
        status: reviewQueue.status,
        count: count(),
      })
      .from(reviewQueue)
      .groupBy(reviewQueue.status);

    const result = { pending: 0, running: 0, completed: 0, failed: 0 };

    for (const stat of stats) {
      if (stat.status in result) {
        result[stat.status as keyof typeof result] = stat.count;
      }
    }

    return result;
  }
}
