CREATE TABLE "interventions" (
	"id" text PRIMARY KEY NOT NULL,
	"type" text NOT NULL,
	"bot_id" text NOT NULL,
	"student_id" text NOT NULL,
	"assignment_id" text,
	"created_by" text,
	"message" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"read_at" timestamp with time zone
);
--> statement-breakpoint
ALTER TABLE "interventions" ADD CONSTRAINT "interventions_bot_id_class_bots_id_fk" FOREIGN KEY ("bot_id") REFERENCES "public"."class_bots"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "interventions" ADD CONSTRAINT "interventions_student_id_users_id_fk" FOREIGN KEY ("student_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "interventions" ADD CONSTRAINT "interventions_assignment_id_assignments_id_fk" FOREIGN KEY ("assignment_id") REFERENCES "public"."assignments"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "interventions" ADD CONSTRAINT "interventions_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "interventions_student_idx" ON "interventions" USING btree ("student_id","created_at");--> statement-breakpoint
CREATE INDEX "interventions_assignment_idx" ON "interventions" USING btree ("assignment_id");