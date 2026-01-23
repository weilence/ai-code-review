import { sqliteTable, text, integer, index } from 'drizzle-orm/sqlite-core';
import type { InlineComment, Summary } from '@/lib/features/review/schema';
import type { GitLabWebhook } from '@/lib/webhooks/types';

// ============================================================================
// Reviews 表
// ============================================================================

export const reviews = sqliteTable('reviews', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  projectId: text('project_id').notNull(),
  projectPath: text('project_path').notNull(),
  mrIid: integer('mr_iid').notNull(),
  mrTitle: text('mr_title').notNull(),
  mrAuthor: text('mr_author').notNull(),
  mrDescription: text('mr_description'),
  sourceBranch: text('source_branch').notNull(),
  targetBranch: text('target_branch').notNull(),
  status: text('status', { enum: ['pending', 'running', 'completed', 'failed'] }).notNull().default('pending'),
  startedAt: integer('started_at', { mode: 'timestamp' }),
  completedAt: integer('completed_at', { mode: 'timestamp' }),
  triggeredBy: text('triggered_by', { enum: ['webhook', 'manual', 'command'] }).notNull(),
  triggerEvent: text('trigger_event'),
  webhookEventId: integer('webhook_event_id').references(() => webhooks.id, { onDelete: 'set null' }),
  retryCount: integer('retry_count').notNull().default(0),
  lastErrorMessage: text('last_error_message'),
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull().$defaultFn(() => new Date()),
  updatedAt: integer('updated_at', { mode: 'timestamp' }).notNull().$defaultFn(() => new Date()),
}, (table) => [
  index('idx_reviews_project_mr').on(table.projectId, table.mrIid),
  index('idx_reviews_status').on(table.status),
  index('idx_reviews_created_at').on(table.createdAt),
  index('idx_reviews_webhook_event_id').on(table.webhookEventId),
]);

// ============================================================================
// Review Logs 表（合并 review_results 和 review_errors）
// ============================================================================

export const reviewLogs = sqliteTable('review_logs', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  reviewId: integer('review_id').notNull().references(() => reviews.id, { onDelete: 'cascade' }),

  // 日志类型：成功结果或错误
  logType: text('log_type', { enum: ['result', 'error'] }).notNull(),

  // ===== 结果字段（logType='result' 时使用） =====
  inlineComments: text('inline_comments', { mode: 'json' }).$type<InlineComment[]>(),
  summary: text('summary', { mode: 'json' }).$type<Summary>(),
  providerUsed: text('provider_used'),
  modelUsed: text('model_used'),
  durationMs: integer('duration_ms'),
  inlineCommentsPosted: integer('inline_comments_posted'),
  summaryPosted: integer('summary_posted'),

  // ===== 错误字段（logType='error' 时使用） =====
  errorType: text('error_type'),
  errorMessage: text('error_message'),
  errorStack: text('error_stack'),
  retryable: integer('retryable', { mode: 'boolean' }).default(true),

  // 通用字段
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull().$defaultFn(() => new Date()),
}, (table) => [
  index('idx_review_logs_review_id').on(table.reviewId),
  index('idx_review_logs_review_id_type').on(table.reviewId, table.logType),
  index('idx_review_logs_created_at').on(table.createdAt),
]);

// ============================================================================
// Webhooks 表
// ============================================================================

export const webhooks = sqliteTable('webhooks', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  objectKind: text('object_kind').notNull(),
  payload: text('payload', { mode: 'json' }).notNull().$type<GitLabWebhook>(),
  projectId: text('project_id'),
  mrIid: integer('mr_iid'),
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull().$defaultFn(() => new Date()),
}, (table) => [
  index('idx_webhooks_object_kind').on(table.objectKind),
  index('idx_webhooks_created_at').on(table.createdAt),
]);

// ============================================================================
// Settings 表
// ============================================================================

export const settings = sqliteTable('settings', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  key: text('key').notNull().unique(),
  value: text('value').notNull(),
  description: text('description'),
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull().$defaultFn(() => new Date()),
  updatedAt: integer('updated_at', { mode: 'timestamp' }).notNull().$defaultFn(() => new Date()),
});

// ============================================================================
// TypeScript 类型导出
// ============================================================================

export type Review = typeof reviews.$inferSelect;
export type NewReview = typeof reviews.$inferInsert;

export type ReviewLog = typeof reviewLogs.$inferSelect;
export type NewReviewLog = typeof reviewLogs.$inferInsert;

export type Webhook = typeof webhooks.$inferSelect;
export type NewWebhook = typeof webhooks.$inferInsert;

export type Setting = typeof settings.$inferSelect;
export type NewSetting = typeof settings.$inferInsert;

// ============================================================================
// Review Queue 表（任务队列）
// ============================================================================

export const reviewQueue = sqliteTable('review_queue', {
  id: integer('id').primaryKey({ autoIncrement: true }),

  // MR 信息
  projectId: text('project_id').notNull(),
  projectPath: text('project_path').notNull(),
  mrIid: integer('mr_iid').notNull(),
  mrTitle: text('mr_title').notNull(),
  mrAuthor: text('mr_author').notNull(),
  mrDescription: text('mr_description'),
  sourceBranch: text('source_branch').notNull(),
  targetBranch: text('target_branch').notNull(),

  // 队列管理字段
  status: text('status', { enum: ['pending', 'running', 'completed', 'failed', 'cancelled'] }).notNull().default('pending'),
  priority: integer('priority').notNull().default(5), // 1-10, 1=highest
  scheduledAt: integer('scheduled_at', { mode: 'timestamp' }), // 延迟执行时间
  lockedAt: integer('locked_at', { mode: 'timestamp' }), // 锁定时间
  lockedBy: text('locked_by'), // Worker 标识（UUID）
  attemptNumber: integer('attempt_number').notNull().default(1),
  maxRetries: integer('max_retries').notNull().default(3),
  nextRetryAt: integer('next_retry_at', { mode: 'timestamp' }), // 下次重试时间

  // 触发信息
  triggeredBy: text('triggered_by', { enum: ['webhook', 'manual', 'command'] }).notNull(),
  triggerEvent: text('trigger_event'),
  webhookEventId: integer('webhook_event_id').references(() => webhooks.id, { onDelete: 'set null' }),

  // 执行结果
  reviewId: integer('review_id').references(() => reviews.id, { onDelete: 'set null' }),
  lastErrorType: text('last_error_type'),
  lastErrorMessage: text('last_error_message'),

  // 时间戳
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull().$defaultFn(() => new Date()),
  updatedAt: integer('updated_at', { mode: 'timestamp' }).notNull().$defaultFn(() => new Date()),
}, (table) => [
  index('idx_queue_status_priority').on(table.status, table.priority),
  index('idx_queue_scheduled_at').on(table.scheduledAt),
  index('idx_queue_locked_at').on(table.lockedAt),
  index('idx_queue_next_retry_at').on(table.nextRetryAt),
  index('idx_queue_project_mr').on(table.projectId, table.mrIid),
]);

// ============================================================================
// TypeScript 类型导出
// ============================================================================

export type QueueTask = typeof reviewQueue.$inferSelect;
export type NewQueueTask = typeof reviewQueue.$inferInsert;
