PRAGMA foreign_keys=OFF;--> statement-breakpoint
CREATE TABLE `__new_activities` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`code` text NOT NULL,
	`title` text NOT NULL,
	`description` text,
	`deadline` integer NOT NULL,
	`creator_id` integer,
	`status` text DEFAULT 'published',
	`created_at` integer,
	`updated_at` integer,
	FOREIGN KEY (`creator_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
INSERT INTO `__new_activities`("id", "code", "title", "description", "deadline", "creator_id", "status", "created_at", "updated_at")
SELECT "id", lower(hex(randomblob(5))), "title", "description", "deadline", "creator_id", "status", "created_at", "updated_at" FROM `activities`;
--> statement-breakpoint
DROP TABLE `activities`;
--> statement-breakpoint
ALTER TABLE `__new_activities` RENAME TO `activities`;
--> statement-breakpoint
CREATE UNIQUE INDEX `activities_code_unique` ON `activities` (`code`);
--> statement-breakpoint
PRAGMA foreign_keys=ON;
