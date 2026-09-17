CREATE TABLE `credit_transactions` (
	`id` text PRIMARY KEY NOT NULL,
	`owner_id` text NOT NULL,
	`customer_id` text NOT NULL,
	`amount` integer NOT NULL,
	`note` text DEFAULT '' NOT NULL,
	`created_at` text NOT NULL,
	FOREIGN KEY (`customer_id`) REFERENCES `customers`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `idx_credit_owner_customer` ON `credit_transactions` (`owner_id`,`customer_id`);--> statement-breakpoint
CREATE TABLE `customers` (
	`id` text PRIMARY KEY NOT NULL,
	`owner_id` text NOT NULL,
	`source_user_id` text,
	`name` text NOT NULL,
	`phone` text DEFAULT '' NOT NULL,
	`created_at` text NOT NULL
);
--> statement-breakpoint
CREATE INDEX `idx_customers_owner_name` ON `customers` (`owner_id`,`name`);--> statement-breakpoint
CREATE TABLE `debt_items` (
	`id` text PRIMARY KEY NOT NULL,
	`owner_id` text NOT NULL,
	`customer_id` text NOT NULL,
	`amount` integer NOT NULL,
	`created_at` text NOT NULL,
	`date` text NOT NULL,
	`invoice_no` text DEFAULT '' NOT NULL,
	`item` text DEFAULT '' NOT NULL,
	`cashier` text DEFAULT '' NOT NULL,
	`qty` integer DEFAULT 1 NOT NULL,
	FOREIGN KEY (`customer_id`) REFERENCES `customers`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `idx_debt_items_owner_customer` ON `debt_items` (`owner_id`,`customer_id`);--> statement-breakpoint
CREATE INDEX `idx_debt_items_owner_date` ON `debt_items` (`owner_id`,`date`);--> statement-breakpoint
CREATE TABLE `import_batches` (
	`id` text PRIMARY KEY NOT NULL,
	`owner_id` text NOT NULL,
	`fingerprint` text NOT NULL,
	`exported_at` text DEFAULT '' NOT NULL,
	`imported_at` text NOT NULL,
	`row_count` integer DEFAULT 0 NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `idx_import_owner_fingerprint` ON `import_batches` (`owner_id`,`fingerprint`);--> statement-breakpoint
CREATE TABLE `payments` (
	`id` text PRIMARY KEY NOT NULL,
	`owner_id` text NOT NULL,
	`debt_item_id` text NOT NULL,
	`amount` integer NOT NULL,
	`paid_at` text NOT NULL,
	`received_by` text DEFAULT '' NOT NULL,
	FOREIGN KEY (`debt_item_id`) REFERENCES `debt_items`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `idx_payments_owner_debt` ON `payments` (`owner_id`,`debt_item_id`);