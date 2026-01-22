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
  webhookEventId: integer('webhook_event_id').references(() => webhooks.id),
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
// Review Results 表
// ============================================================================

export const reviewResults = sqliteTable('review_results', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  reviewId: integer('review_id').notNull().references(() => reviews.id, { onDelete: 'cascade' }),
  inlineComments: text('inline_comments', { mode: 'json' }).notNull().$type<InlineComment[]>(),
  summary: text('summary', { mode: 'json' }).notNull().$type<Summary>(),
  providerUsed: text('provider_used').notNull(),
  modelUsed: text('model_used').notNull(),
  durationMs: integer('duration_ms').notNull(),
  inlineCommentsPosted: integer('inline_comments_posted').notNull(),
  summaryPosted: integer('summary_posted').notNull(),
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull().$defaultFn(() => new Date()),
  updatedAt: integer('updated_at', { mode: 'timestamp' }).notNull().$defaultFn(() => new Date()),
}, (table) => [
  index('idx_review_results_review_id').on(table.reviewId),
]);

// ============================================================================
// Review Errors 表
// ============================================================================

export const reviewErrors = sqliteTable('review_errors', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  reviewId: integer('review_id').notNull().references(() => reviews.id, { onDelete: 'cascade' }),
  errorType: text('error_type').notNull(),
  errorMessage: text('error_message').notNull(),
  errorStack: text('error_stack'),
  retryable: integer('retryable', { mode: 'boolean' }).notNull().default(true),
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull().$defaultFn(() => new Date()),
}, (table) => [
  index('idx_review_errors_review_id').on(table.reviewId),
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

export type ReviewResult = typeof reviewResults.$inferSelect;
export type NewReviewResult = typeof reviewResults.$inferInsert;

export type ReviewError = typeof reviewErrors.$inferSelect;
export type NewReviewError = typeof reviewErrors.$inferInsert;

export type Webhook = typeof webhooks.$inferSelect;
export type NewWebhook = typeof webhooks.$inferInsert;

export type Setting = typeof settings.$inferSelect;
export type NewSetting = typeof settings.$inferInsert;
