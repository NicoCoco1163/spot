CREATE TABLE `registration_devices` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`activity_id` integer NOT NULL,
	`registration_id` integer NOT NULL,
	`device_key` text NOT NULL,
	`created_at` integer,
	FOREIGN KEY (`activity_id`) REFERENCES `activities`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`registration_id`) REFERENCES `registrations`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `registration_devices_activity_id_device_key_unique` ON `registration_devices` (`activity_id`,`device_key`);
