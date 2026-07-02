CREATE TABLE "join_codes" (
	"code" text PRIMARY KEY NOT NULL,
	"bot_id" text NOT NULL,
	"classroom_id" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "join_codes" ADD CONSTRAINT "join_codes_bot_id_class_bots_id_fk" FOREIGN KEY ("bot_id") REFERENCES "public"."class_bots"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "join_codes" ADD CONSTRAINT "join_codes_classroom_id_classrooms_id_fk" FOREIGN KEY ("classroom_id") REFERENCES "public"."classrooms"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "join_codes_bot_idx" ON "join_codes" USING btree ("bot_id");