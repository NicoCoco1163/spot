CREATE TABLE `activities` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`title` text NOT NULL,
	`description` text,
	`start_time` integer NOT NULL,
	`end_time` integer,
	`max_participants` integer NOT NULL,
	`creator_id` integer,
	`status` text DEFAULT 'published',
	`created_at` integer,
	`updated_at` integer,
	FOREIGN KEY (`creator_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `activity_seats` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`activity_id` integer NOT NULL,
	`seat_number` integer NOT NULL,
	`user_id` integer,
	`remark` text,
	`occupied_at` integer,
	FOREIGN KEY (`activity_id`) REFERENCES `activities`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `activity_seats_activity_id_seat_number_unique` ON `activity_seats` (`activity_id`,`seat_number`);--> statement-breakpoint
CREATE TABLE `users` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`openid` text,
	`mobile` text,
	`nickname` text,
	`password` text,
	`is_admin` integer DEFAULT false,
	`created_at` integer,
	`updated_at` integer
);
--> statement-breakpoint
CREATE UNIQUE INDEX `users_openid_unique` ON `users` (`openid`);--> statement-breakpoint
CREATE UNIQUE INDEX `users_mobile_unique` ON `users` (`mobile`);