CREATE TABLE `post_tags` (
	`post_id` integer NOT NULL,
	`tag_id` integer NOT NULL,
	`created_at` text DEFAULT 'CURRENT_TIMESTAMP' NOT NULL,
	PRIMARY KEY(`post_id`, `tag_id`),
	FOREIGN KEY (`post_id`) REFERENCES `posts`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`tag_id`) REFERENCES `tags`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `idx_post_tags_post_id` ON `post_tags` (`post_id`);--> statement-breakpoint
CREATE INDEX `idx_post_tags_tag_id` ON `post_tags` (`tag_id`);--> statement-breakpoint
CREATE TABLE `posts` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`title` text,
	`content` text NOT NULL,
	`excerpt` text,
	`slug` text NOT NULL,
	`type` text DEFAULT 'article' NOT NULL,
	`status` text DEFAULT 'draft' NOT NULL,
	`language` text DEFAULT 'auto' NOT NULL,
	`created_at` text DEFAULT 'CURRENT_TIMESTAMP' NOT NULL,
	`updated_at` text DEFAULT 'CURRENT_TIMESTAMP' NOT NULL,
	`published_at` text
);
--> statement-breakpoint
CREATE UNIQUE INDEX `posts_slug_unique` ON `posts` (`slug`);--> statement-breakpoint
CREATE INDEX `idx_posts_status` ON `posts` (`status`);--> statement-breakpoint
CREATE INDEX `idx_posts_type` ON `posts` (`type`);--> statement-breakpoint
CREATE INDEX `idx_posts_published_at` ON `posts` (`published_at`);--> statement-breakpoint
CREATE INDEX `idx_posts_slug` ON `posts` (`slug`);--> statement-breakpoint
CREATE TABLE `site_config` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`site_title` text DEFAULT 'My Blog' NOT NULL,
	`site_subtitle` text,
	`author_name` text DEFAULT 'Author' NOT NULL,
	`meta_description` text,
	`social_links` text,
	`is_active` integer DEFAULT true NOT NULL,
	`created_at` text DEFAULT 'CURRENT_TIMESTAMP' NOT NULL,
	`updated_at` text DEFAULT 'CURRENT_TIMESTAMP' NOT NULL
);
--> statement-breakpoint
CREATE INDEX `idx_site_config_active` ON `site_config` (`is_active`);--> statement-breakpoint
CREATE TABLE `tags` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`name` text NOT NULL,
	`slug` text NOT NULL,
	`description` text,
	`created_at` text DEFAULT 'CURRENT_TIMESTAMP' NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `tags_name_unique` ON `tags` (`name`);--> statement-breakpoint
CREATE UNIQUE INDEX `tags_slug_unique` ON `tags` (`slug`);--> statement-breakpoint
CREATE INDEX `idx_tags_slug` ON `tags` (`slug`);