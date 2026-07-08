PRAGMA foreign_keys=OFF;--> statement-breakpoint
CREATE TABLE `__new_registrations` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`activity_id` integer NOT NULL,
	`mobile` text NOT NULL,
	`team_name` text,
	`song_name` text,
	`song_duration` integer,
	`members` text,
	`created_at` integer,
	`updated_at` integer,
	FOREIGN KEY (`activity_id`) REFERENCES `activities`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
INSERT INTO `__new_registrations`("id", "activity_id", "mobile", "team_name", "song_name", "song_duration", "members", "created_at", "updated_at")
SELECT "id", "activity_id", "mobile", "captain", "song", NULL, "members", "created_at", "updated_at" FROM `registrations`;
--> statement-breakpoint
DROP TABLE `registrations`;
--> statement-breakpoint
ALTER TABLE `__new_registrations` RENAME TO `registrations`;
--> statement-breakpoint
CREATE UNIQUE INDEX `registrations_activity_id_mobile_unique` ON `registrations` (`activity_id`,`mobile`);
--> statement-breakpoint
PRAGMA foreign_keys=ON;
