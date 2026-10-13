CREATE TABLE `chat_sessions` (
	`id` text PRIMARY KEY NOT NULL,
	`token_hash` text NOT NULL,
	`source` text NOT NULL,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL,
	`lock_until` integer DEFAULT 0 NOT NULL
);
--> statement-breakpoint
CREATE TABLE `chat_turns` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`session_id` text NOT NULL,
	`request_id` text NOT NULL,
	`user_text` text NOT NULL,
	`assistant_text` text,
	`requested_at` text NOT NULL,
	`responded_at` text,
	`status` text NOT NULL,
	`error` text,
	FOREIGN KEY (`session_id`) REFERENCES `chat_sessions`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `chat_turn_request` ON `chat_turns` (`session_id`,`request_id`);--> statement-breakpoint
CREATE INDEX `chat_turn_session` ON `chat_turns` (`session_id`,`id`);