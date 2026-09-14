CREATE TABLE IF NOT EXISTS `usage_events` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`userId` text NOT NULL,
	`model` text NOT NULL,
	`promptTokens` integer DEFAULT 0 NOT NULL,
	`completionTokens` integer DEFAULT 0 NOT NULL,
	`totalTokens` integer DEFAULT 0 NOT NULL,
	`estimatedCents` integer DEFAULT 0 NOT NULL,
	`createdAt` text NOT NULL
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS `usage_events_user_created` ON `usage_events` (`userId`, `createdAt`);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS `usage_quotas` (
	`userId` text PRIMARY KEY NOT NULL,
	`monthlyTokenLimit` integer DEFAULT 2000000 NOT NULL,
	`enforce` integer DEFAULT 1 NOT NULL,
	`updatedAt` text NOT NULL
);
