ALTER TABLE "join_codes" DROP CONSTRAINT "join_codes_bot_id_class_bots_id_fk";
--> statement-breakpoint
ALTER TABLE "join_codes" DROP CONSTRAINT "join_codes_classroom_id_classrooms_id_fk";
--> statement-breakpoint
ALTER TABLE "join_codes" ADD COLUMN "teacher_id" text NOT NULL;
--> statement-breakpoint
CREATE UNIQUE INDEX "class_bots_id_teacher_uq" ON "class_bots" USING btree ("id","teacher_id");
--> statement-breakpoint
CREATE UNIQUE INDEX "classrooms_id_teacher_uq" ON "classrooms" USING btree ("id","teacher_id");
--> statement-breakpoint
ALTER TABLE "join_codes" ADD CONSTRAINT "join_codes_bot_owner_fk" FOREIGN KEY ("bot_id","teacher_id") REFERENCES "public"."class_bots"("id","teacher_id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "join_codes" ADD CONSTRAINT "join_codes_classroom_owner_fk" FOREIGN KEY ("classroom_id","teacher_id") REFERENCES "public"."classrooms"("id","teacher_id") ON DELETE cascade ON UPDATE no action;
