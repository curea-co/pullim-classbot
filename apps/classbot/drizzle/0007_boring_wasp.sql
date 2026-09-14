CREATE TABLE "self_study_days" (
	"student_id" text NOT NULL,
	"study_date" date NOT NULL,
	"origin" text DEFAULT 'app' NOT NULL,
	CONSTRAINT "self_study_days_student_id_study_date_pk" PRIMARY KEY("student_id","study_date")
);
--> statement-breakpoint
ALTER TABLE "self_study_days" ADD CONSTRAINT "self_study_days_student_id_users_id_fk" FOREIGN KEY ("student_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;