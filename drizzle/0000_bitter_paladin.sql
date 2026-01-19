CREATE TABLE `review_errors` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`review_id` integer NOT NULL,
	`error_type` text NOT NULL,
	`error_message` text NOT NULL,
	`error_stack` text,
	`retryable` integer DEFAULT true NOT NULL,
	`created_at` integer NOT NULL,
	FOREIGN KEY (`review_id`) REFERENCES `reviews`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `idx_review_errors_review_id` ON `review_errors` (`review_id`);--> statement-breakpoint
CREATE TABLE `review_results` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`review_id` integer NOT NULL,
	`inline_comments` text NOT NULL,
	`summary` text NOT NULL,
	`provider_used` text NOT NULL,
	`model_used` text NOT NULL,
	`duration_ms` integer NOT NULL,
	`inline_comments_posted` integer NOT NULL,
	`summary_posted` integer NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	FOREIGN KEY (`review_id`) REFERENCES `reviews`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `idx_review_results_review_id` ON `review_results` (`review_id`);--> statement-breakpoint
CREATE TABLE `reviews` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`project_id` text NOT NULL,
	`project_path` text NOT NULL,
	`mr_iid` integer NOT NULL,
	`mr_title` text NOT NULL,
	`mr_author` text NOT NULL,
	`mr_description` text,
	`source_branch` text NOT NULL,
	`target_branch` text NOT NULL,
	`status` text DEFAULT 'pending' NOT NULL,
	`started_at` integer,
	`completed_at` integer,
	`triggered_by` text NOT NULL,
	`trigger_event` text,
	`webhook_event_id` integer,
	`retry_count` integer DEFAULT 0 NOT NULL,
	`last_error_message` text,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	FOREIGN KEY (`webhook_event_id`) REFERENCES `webhooks`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `idx_reviews_project_mr` ON `reviews` (`project_id`,`mr_iid`);--> statement-breakpoint
CREATE INDEX `idx_reviews_status` ON `reviews` (`status`);--> statement-breakpoint
CREATE INDEX `idx_reviews_created_at` ON `reviews` (`created_at`);--> statement-breakpoint
CREATE INDEX `idx_reviews_webhook_event_id` ON `reviews` (`webhook_event_id`);--> statement-breakpoint
CREATE TABLE `settings` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`key` text NOT NULL,
	`value` text NOT NULL,
	`description` text,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `settings_key_unique` ON `settings` (`key`);--> statement-breakpoint
CREATE TABLE `webhooks` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`event_type` text NOT NULL,
	`object_kind` text NOT NULL,
	`payload` text NOT NULL,
	`project_id` text,
	`mr_iid` integer,
	`processed` integer DEFAULT false NOT NULL,
	`created_at` integer NOT NULL
);
--> statement-breakpoint
CREATE INDEX `idx_webhooks_event_type` ON `webhooks` (`event_type`);--> statement-breakpoint
CREATE INDEX `idx_webhooks_created_at` ON `webhooks` (`created_at`);