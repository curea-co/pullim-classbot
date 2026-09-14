CREATE TABLE "self_enrollments" (
	"bot_id" text NOT NULL,
	"student_id" text NOT NULL,
	"added_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "self_enrollments_bot_id_student_id_pk" PRIMARY KEY("bot_id","student_id")
);
--> statement-breakpoint
ALTER TABLE "self_enrollments" ADD CONSTRAINT "self_enrollments_bot_id_class_bots_id_fk" FOREIGN KEY ("bot_id") REFERENCES "public"."class_bots"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "self_enrollments" ADD CONSTRAINT "self_enrollments_student_id_users_id_fk" FOREIGN KEY ("student_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "self_enrollments_student_idx" ON "self_enrollments" USING btree ("student_id");