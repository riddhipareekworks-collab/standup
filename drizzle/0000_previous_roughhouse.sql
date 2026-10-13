CREATE TABLE `agent_settings` (
	`id` text PRIMARY KEY NOT NULL,
	`persona` text NOT NULL,
	`tone` text NOT NULL,
	`empathy` integer NOT NULL,
	`goal_orientation` integer NOT NULL,
	`updated_at` text NOT NULL
);
