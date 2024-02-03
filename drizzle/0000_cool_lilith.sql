CREATE TABLE `projects` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`content` text NOT NULL,
	`public` integer DEFAULT false NOT NULL,
	`created_at` integer DEFAULT (unixepoch('subsec')) NOT NULL,
	`updated_at` integer DEFAULT (unixepoch('subsec')) NOT NULL,
	`deleted_at` integer DEFAULT (unixepoch('subsec')) NOT NULL
);
