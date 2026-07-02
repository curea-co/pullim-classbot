CREATE TABLE "join_codes" (
	"code" text PRIMARY KEY NOT NULL,
	"bot_id" text NOT NULL,
	"classroom_id" text NOT NULL,
	"teacher_id" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX "class_bots_id_teacher_uq" ON "class_bots" USING btree ("id","teacher_id");
--> statement-breakpoint
CREATE UNIQUE INDEX "classrooms_id_teacher_uq" ON "classrooms" USING btree ("id","teacher_id");
--> statement-breakpoint
ALTER TABLE "join_codes" ADD CONSTRAINT "join_codes_bot_owner_fk" FOREIGN KEY ("bot_id","teacher_id") REFERENCES "public"."class_bots"("id","teacher_id") ON DELETE cascade ON UPDATE cascade;
--> statement-breakpoint
ALTER TABLE "join_codes" ADD CONSTRAINT "join_codes_classroom_owner_fk" FOREIGN KEY ("classroom_id","teacher_id") REFERENCES "public"."classrooms"("id","teacher_id") ON DELETE cascade ON UPDATE cascade;
--> statement-breakpoint
CREATE INDEX "join_codes_bot_idx" ON "join_codes" USING btree ("bot_id");
