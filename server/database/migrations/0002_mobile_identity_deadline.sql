PRAGMA foreign_keys=OFF;--> statement-breakpoint
CREATE TABLE `__new_activities` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
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
INSERT INTO `__new_activities`("id", "title", "description", "deadline", "creator_id", "status", "created_at", "updated_at")
SELECT "id", "title", "description", COALESCE("registration_deadline", "start_time", "created_at", unixepoch()), "creator_id", "status", "created_at", "updated_at" FROM `activities`;
--> statement-breakpoint
DROP TABLE `activities`;
--> statement-breakpoint
ALTER TABLE `__new_activities` RENAME TO `activities`;
--> statement-breakpoint
CREATE TABLE `__new_registrations` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`activity_id` integer NOT NULL,
	`mobile` text NOT NULL,
	`song` text,
	`captain` text,
	`members` text,
	`created_at` integer,
	`updated_at` integer,
	FOREIGN KEY (`activity_id`) REFERENCES `activities`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
INSERT INTO `__new_registrations`("id", "activity_id", "mobile", "song", "captain", "members", "created_at", "updated_at")
SELECT r."id", r."activity_id", COALESCE(u."mobile", ''), r."song", r."captain", r."members", r."created_at", r."updated_at"
FROM `registrations` r
LEFT JOIN `users` u ON u."id" = r."user_id";
--> statement-breakpoint
DROP TABLE `registrations`;
--> statement-breakpoint
ALTER TABLE `__new_registrations` RENAME TO `registrations`;
--> statement-breakpoint
CREATE UNIQUE INDEX `registrations_activity_id_mobile_unique` ON `registrations` (`activity_id`,`mobile`);
--> statement-breakpoint
CREATE TABLE `__new_activity_seats` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`activity_id` integer NOT NULL,
	`seat_number` integer NOT NULL,
	`mobile` text,
	`registration_id` integer,
	`remark` text,
	`occupied_at` integer,
	FOREIGN KEY (`activity_id`) REFERENCES `activities`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`registration_id`) REFERENCES `registrations`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
INSERT INTO `__new_activity_seats`("id", "activity_id", "seat_number", "mobile", "registration_id", "remark", "occupied_at")
SELECT s."id", s."activity_id", s."seat_number", u."mobile", s."registration_id", s."remark", s."occupied_at"
FROM `activity_seats` s
LEFT JOIN `users` u ON u."id" = s."user_id";
--> statement-breakpoint
DROP TABLE `activity_seats`;
--> statement-breakpoint
ALTER TABLE `__new_activity_seats` RENAME TO `activity_seats`;
--> statement-breakpoint
CREATE UNIQUE INDEX `activity_seats_activity_id_seat_number_unique` ON `activity_seats` (`activity_id`,`seat_number`);
--> statement-breakpoint
PRAGMA foreign_keys=ON;
