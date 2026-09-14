ALTER TABLE "class_bots" ADD COLUMN "is_published" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "class_bots" ADD COLUMN "published_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "class_bots" ADD COLUMN "publish_blurb" text;