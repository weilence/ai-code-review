DROP INDEX `idx_webhooks_event_type`;--> statement-breakpoint
CREATE INDEX `idx_webhooks_object_kind` ON `webhooks` (`object_kind`);--> statement-breakpoint
ALTER TABLE `webhooks` DROP COLUMN `event_type`;