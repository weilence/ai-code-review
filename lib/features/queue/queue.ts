import { eq, and, sql, count } from 'drizzle-orm';
import { getDb, reviewQueue, type QueueTask } from '@/lib/db';
import type { EnqueueOptions } from './schema';
import { createLogger } from '@/lib/utils/logger';

const logger = createLogger('task-queue');

export class TaskQueue {
  async enqueue(options: EnqueueOptions): Promise<number> {
    const db = await getDb();
    const projectId = String(options.projectId);
    const now = Date.now();

    try {
      const insertResult = await db
        .insert(reviewQueue)
        .values({
          projectId,
          projectPath: options.projectPath || '',
          mrIid: options.mrIid,
          mrTitle: options.mrTitle || '',
          mrAuthor: options.mrAuthor || '',
          mrDescription: options.mrDescription || null,
          sourceBranch: options.sourceBranch || '',
          targetBranch: options.targetBranch || '',
          status: 'pending',
          priority: options.priority || 5,
          scheduledAt: options.scheduledAt || null,
          triggeredBy: options.triggeredBy,
          triggerEvent: options.triggerEvent || null,
          webhookEventId: options.webhookEventId || null,
          reviewId: options.reviewId || null,
          createdAt: new Date(now),
          updatedAt: new Date(now),
        })
        .onConflictDoNothing()
        .returning();

      if (insertResult.length > 0) {
        const task = insertResult[0];
        logger.info(
          { taskId: task.id, projectId, mrIid: options.mrIid, priority: task.priority },
          'Task enqueued successfully'
        );
        return task.id;
      }

      const existingTasks = await db
        .select({ id: reviewQueue.id })
        .from(reviewQueue)
        .where(
          and(
            eq(reviewQueue.projectId, projectId),
            eq(reviewQueue.mrIid, options.mrIid),
            eq(reviewQueue.status, 'pending')
          )
        )
        .limit(1);

      if (existingTasks.length > 0) {
        logger.info(
          { taskId: existingTasks[0].id, projectId, mrIid: options.mrIid },
          'Task already pending, returning existing ID'
        );
        return existingTasks[0].id;
      }

      throw new Error('Insert failed and no existing task found');
    } catch (error) {
      logger.error({ error, projectId, mrIid: options.mrIid }, 'Failed to enqueue task');
      throw error;
    }
  }

  async dequeue(_workerId: string): Promise<QueueTask | null> {
    const db = await getDb();
    const now = Date.now();

    try {
      const task = await db
        .select()
        .from(reviewQueue)
        .where(eq(reviewQueue.status, 'pending'))
        .orderBy(reviewQueue.priority, reviewQueue.createdAt)
        .limit(1);

      if (!task || task.length === 0) {
        return null;
      }

      const [updatedTask] = await db
        .update(reviewQueue)
        .set({
          status: 'running',
          lockedAt: new Date(now),
          lockedBy: _workerId,
          updatedAt: new Date(now),
        })
        .where(eq(reviewQueue.id, task[0].id))
        .returning();

      logger.debug(
        { taskId: updatedTask.id, projectId: updatedTask.projectId, mrIid: updatedTask.mrIid },
        'Task dequeued successfully'
      );

      return updatedTask;
    } catch (error) {
      logger.error({ error }, 'Failed to dequeue task');
      throw error;
    }
  }

  async releaseLock(taskId: number, workerId: string): Promise<boolean> {
    const db = await getDb();
    const result = await db
      .update(reviewQueue)
      .set({
        status: 'pending',
        lockedAt: null,
        lockedBy: null,
        updatedAt: new Date(),
      })
      .where(
        and(
          eq(reviewQueue.id, taskId),
          eq(reviewQueue.lockedBy, workerId)
        )
      );

    const released = result.rowsAffected > 0;
    if (released) {
      logger.info({ taskId, workerId }, 'Task lock released');
    } else {
      logger.warn({ taskId, workerId }, 'Task lock release failed: task not found or locked by different worker');
    }
    return released;
  }

  async cancelTask(taskId: number): Promise<boolean> {
    const db = await getDb();
    const result = await db
      .update(reviewQueue)
      .set({
        status: 'cancelled',
        updatedAt: new Date(),
      })
      .where(and(eq(reviewQueue.id, taskId), eq(reviewQueue.status, 'pending')));

    const cancelled = result.rowsAffected > 0;
    if (cancelled) {
      logger.info({ taskId }, 'Task cancelled');
    }
    return cancelled;
  }

  async markCompleted(taskId: number, reviewId: number, durationMs: number): Promise<boolean> {
    const db = await getDb();
    const result = await db
      .update(reviewQueue)
      .set({
        status: 'completed',
        reviewId,
        updatedAt: new Date(),
      })
      .where(eq(reviewQueue.id, taskId));

    const completed = result.rowsAffected > 0;
    if (completed) {
      logger.info({ taskId, reviewId, durationMs }, 'Task marked as completed');
    } else {
      logger.warn({ taskId }, 'Task not found when marking as completed');
    }
    return completed;
  }

  async markFailed(
    taskId: number,
    error: Error,
    nextRetryAt?: Date
  ): Promise<boolean> {
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
    const result = await db.update(reviewQueue).set(updateData).where(eq(reviewQueue.id, taskId));

    const updated = result.rowsAffected > 0;
    if (updated) {
      logger.info(
        { taskId, errorType: error.constructor.name, nextRetryAt },
        nextRetryAt ? 'Task scheduled for retry' : 'Task marked as permanently failed'
      );
    } else {
      logger.warn({ taskId }, 'Task not found when marking as failed');
    }
    return updated;
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

    const result = await db.update(reviewQueue)
      .set({
        status: 'pending',
        lockedAt: null,
        lockedBy: null,
        updatedAt: new Date(),
      })
      .where(and(
        eq(reviewQueue.status, 'running'),
        sql`${reviewQueue.lockedAt} < ${timeoutThreshold}`
      ));

    const count = result.rowsAffected;
    logger.info({ count }, 'Stuck tasks requeued');
    return count;
  }

  async cleanupOldTasks(retainDays: number): Promise<number> {
    const db = await getDb();
    const cutoffTime = Date.now() - retainDays * 24 * 60 * 60 * 1000;

    const result = await db.delete(reviewQueue)
      .where(and(
        eq(reviewQueue.status, 'completed'),
        sql`${reviewQueue.updatedAt} < ${cutoffTime}`
      ));

    const count = result.rowsAffected;
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
