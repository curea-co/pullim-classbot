CREATE TABLE "assignment_questions" (
	"id" text PRIMARY KEY NOT NULL,
	"assignment_id" text NOT NULL,
	"order" integer NOT NULL,
	"type" text NOT NULL,
	"prompt" text NOT NULL,
	"options" jsonb,
	"answer_index" integer,
	"answer_key" text,
	"model_answer" text,
	"hints" jsonb
);
--> statement-breakpoint
CREATE TABLE "assignments" (
	"id" text PRIMARY KEY NOT NULL,
	"bot_id" text NOT NULL,
	"student_id" text,
	"title" text NOT NULL,
	"scope" text NOT NULL,
	"subject" text NOT NULL,
	"grade" text NOT NULL,
	"chapter_from" text NOT NULL,
	"chapter_to" text NOT NULL,
	"achievement_codes" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"question_count" integer NOT NULL,
	"difficulty" text NOT NULL,
	"mode" text NOT NULL,
	"scope_override" integer,
	"source" text NOT NULL,
	"assigned_by" text NOT NULL,
	"assigned_at_label" text NOT NULL,
	"due_label" text NOT NULL,
	"d_day" text NOT NULL,
	"completed_count" integer DEFAULT 0 NOT NULL,
	"recent_accuracy" integer,
	"state" text NOT NULL,
	"reason_hint" text,
	"solve_href" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE "bot_curriculum_units" (
	"id" text PRIMARY KEY NOT NULL,
	"bot_id" text NOT NULL,
	"label" text NOT NULL,
	"full_path" text NOT NULL,
	"achievement_codes" jsonb DEFAULT '[]'::jsonb NOT NULL
);
--> statement-breakpoint
CREATE TABLE "bot_questions" (
	"id" text PRIMARY KEY NOT NULL,
	"live_session_id" text,
	"student_id" text,
	"student_name" text NOT NULL,
	"question" text NOT NULL,
	"scope_used" integer NOT NULL,
	"shared" boolean DEFAULT false NOT NULL,
	"bot_answer_preview" text NOT NULL,
	"tier" text NOT NULL,
	"ago_min" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "bot_settings" (
	"bot_id" text PRIMARY KEY NOT NULL,
	"settings" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "chat_messages" (
	"id" text PRIMARY KEY NOT NULL,
	"bot_id" text NOT NULL,
	"student_id" text NOT NULL,
	"role" text NOT NULL,
	"text" text NOT NULL,
	"reply_key" text,
	"scope_used" integer,
	"tier" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "class_bots" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"avatar_emoji" text DEFAULT '🤖' NOT NULL,
	"teacher_id" text,
	"teacher_name" text NOT NULL,
	"organization" text NOT NULL,
	"subject" text NOT NULL,
	"grade" text NOT NULL,
	"tone" text NOT NULL,
	"greeting" text NOT NULL,
	"scope" integer DEFAULT 3 NOT NULL,
	"is_live" boolean DEFAULT false NOT NULL,
	"current_lesson" jsonb,
	"quick_prompts" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"enrolled_count" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "classrooms" (
	"id" text PRIMARY KEY NOT NULL,
	"label" text NOT NULL,
	"organization" text NOT NULL,
	"teacher_id" text
);
--> statement-breakpoint
CREATE TABLE "consent_logs" (
	"id" text PRIMARY KEY NOT NULL,
	"parent_id" text NOT NULL,
	"student_id" text NOT NULL,
	"type" text NOT NULL,
	"granted_at" timestamp with time zone NOT NULL,
	"expires_at" timestamp with time zone,
	"scope_label" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE "crisis_alerts" (
	"id" text PRIMARY KEY NOT NULL,
	"student_id" text NOT NULL,
	"trigger_type" text NOT NULL,
	"severity" integer NOT NULL,
	"detected_at_label" text NOT NULL,
	"detected_at" timestamp with time zone DEFAULT now() NOT NULL,
	"summary" text NOT NULL,
	"notified_teacher" boolean DEFAULT false NOT NULL,
	"notified_parent" boolean DEFAULT false NOT NULL,
	"notified_wee_center" boolean DEFAULT false NOT NULL,
	"resolved" boolean DEFAULT false NOT NULL
);
--> statement-breakpoint
CREATE TABLE "emotion_checkins" (
	"id" text PRIMARY KEY NOT NULL,
	"student_id" text NOT NULL,
	"date" text NOT NULL,
	"mood" integer NOT NULL,
	"intensity" integer,
	"intensity_range" jsonb,
	"free_text" text,
	"keyword_flag" text
);
--> statement-breakpoint
CREATE TABLE "enrollments" (
	"bot_id" text NOT NULL,
	"student_id" text NOT NULL,
	"classroom_id" text NOT NULL,
	"classroom_label" text NOT NULL,
	"assigned_by" text NOT NULL,
	"assigned_at" timestamp with time zone NOT NULL,
	"via" text NOT NULL,
	CONSTRAINT "enrollments_bot_id_student_id_pk" PRIMARY KEY("bot_id","student_id")
);
--> statement-breakpoint
CREATE TABLE "grading_history" (
	"id" serial PRIMARY KEY NOT NULL,
	"student_id" text NOT NULL,
	"assignment_title" text NOT NULL,
	"graded_at_label" text NOT NULL,
	"score" integer NOT NULL,
	"max_score" integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE "grading_items" (
	"id" text PRIMARY KEY NOT NULL,
	"student_id" text NOT NULL,
	"student_name" text NOT NULL,
	"assignment_title" text NOT NULL,
	"submitted_at_label" text NOT NULL,
	"type" text NOT NULL,
	"topic" text NOT NULL,
	"draft_score" integer NOT NULL,
	"max_score" integer NOT NULL,
	"tier" text NOT NULL,
	"ai_confidence" integer NOT NULL,
	"response_preview" text NOT NULL,
	"draft_comment" text NOT NULL,
	"rubric" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"status" text NOT NULL,
	"override_delta" integer
);
--> statement-breakpoint
CREATE TABLE "lessons" (
	"id" text PRIMARY KEY NOT NULL,
	"bot_id" text NOT NULL,
	"classroom_id" text,
	"title" text NOT NULL,
	"chapter" text NOT NULL,
	"start_label" text NOT NULL,
	"scheduled_start" timestamp with time zone,
	"duration_min" integer,
	"status" text NOT NULL,
	"prep_ready" double precision DEFAULT 0 NOT NULL,
	"student_count" integer DEFAULT 0 NOT NULL,
	"bot_name" text
);
--> statement-breakpoint
CREATE TABLE "live_quizzes" (
	"id" text PRIMARY KEY NOT NULL,
	"live_session_id" text,
	"question" text NOT NULL,
	"type" text NOT NULL,
	"options" jsonb,
	"answer_index" integer,
	"distribution" jsonb,
	"responded" integer DEFAULT 0 NOT NULL,
	"total" integer DEFAULT 0 NOT NULL,
	"correct_rate" integer DEFAULT 0 NOT NULL,
	"scope" text NOT NULL,
	"tier" text NOT NULL,
	"status" text NOT NULL,
	"start_label" text NOT NULL,
	"remaining_sec" integer
);
--> statement-breakpoint
CREATE TABLE "live_sessions" (
	"id" text PRIMARY KEY NOT NULL,
	"bot_id" text NOT NULL,
	"classroom_id" text,
	"lesson_id" text,
	"bot_name" text NOT NULL,
	"bot_emoji" text,
	"classroom_label" text NOT NULL,
	"subject" text NOT NULL,
	"status" text NOT NULL,
	"start_label" text NOT NULL,
	"started_at" timestamp with time zone,
	"ended_at" timestamp with time zone,
	"duration_min" integer NOT NULL,
	"participant_count" integer DEFAULT 0 NOT NULL,
	"total_count" integer DEFAULT 0 NOT NULL,
	"scope" integer DEFAULT 3 NOT NULL,
	"intensity" integer DEFAULT 0 NOT NULL,
	"alert_count" integer DEFAULT 0 NOT NULL,
	"roster" jsonb DEFAULT '[]'::jsonb NOT NULL
);
--> statement-breakpoint
CREATE TABLE "parent_child_links" (
	"parent_id" text NOT NULL,
	"student_id" text NOT NULL,
	"relation" text NOT NULL,
	"primary" boolean DEFAULT false NOT NULL,
	"phone" text,
	"kakao_id" text,
	CONSTRAINT "parent_child_links_parent_id_student_id_pk" PRIMARY KEY("parent_id","student_id")
);
--> statement-breakpoint
CREATE TABLE "replay_bookmarks" (
	"id" text PRIMARY KEY NOT NULL,
	"replay_id" text NOT NULL,
	"student_id" text NOT NULL,
	"at_sec" integer NOT NULL,
	"label" text NOT NULL,
	"created_at_label" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "replay_teacher_questions" (
	"id" text PRIMARY KEY NOT NULL,
	"replay_id" text NOT NULL,
	"student_id" text NOT NULL,
	"at_sec" integer NOT NULL,
	"text" text NOT NULL,
	"status" text NOT NULL,
	"reply" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "replay_watch_progress" (
	"replay_id" text NOT NULL,
	"student_id" text NOT NULL,
	"last_sec" integer DEFAULT 0 NOT NULL,
	"completed" boolean DEFAULT false NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "replay_watch_progress_replay_id_student_id_pk" PRIMARY KEY("replay_id","student_id")
);
--> statement-breakpoint
CREATE TABLE "replays" (
	"id" text PRIMARY KEY NOT NULL,
	"lesson_id" text,
	"bot_id" text NOT NULL,
	"classroom" text NOT NULL,
	"title" text NOT NULL,
	"chapter" text NOT NULL,
	"bot_name" text NOT NULL,
	"date" text NOT NULL,
	"started_at_label" text NOT NULL,
	"ended_at_label" text NOT NULL,
	"duration_min" integer NOT NULL,
	"participant_count" integer NOT NULL,
	"status" text NOT NULL,
	"ai_processed_at_label" text,
	"sent_at_label" text,
	"my_accuracy" integer DEFAULT 0 NOT NULL,
	"key_takeaways" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"segments" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"transcript" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"focus_bins" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"viewer_stats" jsonb
);
--> statement-breakpoint
CREATE TABLE "reports" (
	"id" text PRIMARY KEY NOT NULL,
	"kind" text NOT NULL,
	"title" text NOT NULL,
	"subject" text NOT NULL,
	"generated_at_label" text NOT NULL,
	"status" text NOT NULL,
	"kpis" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"summary" text NOT NULL,
	"alerts" jsonb DEFAULT '[]'::jsonb NOT NULL
);
--> statement-breakpoint
CREATE TABLE "templates" (
	"id" text PRIMARY KEY NOT NULL,
	"kind" text NOT NULL,
	"title" text NOT NULL,
	"author_name" text NOT NULL,
	"author_organization" text NOT NULL,
	"is_official" boolean DEFAULT false NOT NULL,
	"pricing" jsonb NOT NULL,
	"subject" text NOT NULL,
	"grade" text NOT NULL,
	"downloads" integer DEFAULT 0 NOT NULL,
	"rating" double precision DEFAULT 0 NOT NULL,
	"rating_count" integer DEFAULT 0 NOT NULL,
	"description" text NOT NULL,
	"highlights" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"updated_at_label" text NOT NULL,
	"publish_status" text DEFAULT 'published' NOT NULL,
	"earnings" integer
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"role" text NOT NULL,
	"profile" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "wellbeing_snapshots" (
	"student_id" text NOT NULL,
	"date" text NOT NULL,
	"score" integer NOT NULL,
	"flag" text,
	CONSTRAINT "wellbeing_snapshots_student_id_date_pk" PRIMARY KEY("student_id","date")
);
--> statement-breakpoint
ALTER TABLE "assignment_questions" ADD CONSTRAINT "assignment_questions_assignment_id_assignments_id_fk" FOREIGN KEY ("assignment_id") REFERENCES "public"."assignments"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "assignments" ADD CONSTRAINT "assignments_bot_id_class_bots_id_fk" FOREIGN KEY ("bot_id") REFERENCES "public"."class_bots"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "assignments" ADD CONSTRAINT "assignments_student_id_users_id_fk" FOREIGN KEY ("student_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "bot_curriculum_units" ADD CONSTRAINT "bot_curriculum_units_bot_id_class_bots_id_fk" FOREIGN KEY ("bot_id") REFERENCES "public"."class_bots"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "bot_questions" ADD CONSTRAINT "bot_questions_live_session_id_live_sessions_id_fk" FOREIGN KEY ("live_session_id") REFERENCES "public"."live_sessions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "bot_questions" ADD CONSTRAINT "bot_questions_student_id_users_id_fk" FOREIGN KEY ("student_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "bot_settings" ADD CONSTRAINT "bot_settings_bot_id_class_bots_id_fk" FOREIGN KEY ("bot_id") REFERENCES "public"."class_bots"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "chat_messages" ADD CONSTRAINT "chat_messages_bot_id_class_bots_id_fk" FOREIGN KEY ("bot_id") REFERENCES "public"."class_bots"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "chat_messages" ADD CONSTRAINT "chat_messages_student_id_users_id_fk" FOREIGN KEY ("student_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "class_bots" ADD CONSTRAINT "class_bots_teacher_id_users_id_fk" FOREIGN KEY ("teacher_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "classrooms" ADD CONSTRAINT "classrooms_teacher_id_users_id_fk" FOREIGN KEY ("teacher_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "consent_logs" ADD CONSTRAINT "consent_logs_parent_id_users_id_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "consent_logs" ADD CONSTRAINT "consent_logs_student_id_users_id_fk" FOREIGN KEY ("student_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "crisis_alerts" ADD CONSTRAINT "crisis_alerts_student_id_users_id_fk" FOREIGN KEY ("student_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "emotion_checkins" ADD CONSTRAINT "emotion_checkins_student_id_users_id_fk" FOREIGN KEY ("student_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "enrollments" ADD CONSTRAINT "enrollments_bot_id_class_bots_id_fk" FOREIGN KEY ("bot_id") REFERENCES "public"."class_bots"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "enrollments" ADD CONSTRAINT "enrollments_student_id_users_id_fk" FOREIGN KEY ("student_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "enrollments" ADD CONSTRAINT "enrollments_classroom_id_classrooms_id_fk" FOREIGN KEY ("classroom_id") REFERENCES "public"."classrooms"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "grading_history" ADD CONSTRAINT "grading_history_student_id_users_id_fk" FOREIGN KEY ("student_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "grading_items" ADD CONSTRAINT "grading_items_student_id_users_id_fk" FOREIGN KEY ("student_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "lessons" ADD CONSTRAINT "lessons_bot_id_class_bots_id_fk" FOREIGN KEY ("bot_id") REFERENCES "public"."class_bots"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "lessons" ADD CONSTRAINT "lessons_classroom_id_classrooms_id_fk" FOREIGN KEY ("classroom_id") REFERENCES "public"."classrooms"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "live_quizzes" ADD CONSTRAINT "live_quizzes_live_session_id_live_sessions_id_fk" FOREIGN KEY ("live_session_id") REFERENCES "public"."live_sessions"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "live_sessions" ADD CONSTRAINT "live_sessions_bot_id_class_bots_id_fk" FOREIGN KEY ("bot_id") REFERENCES "public"."class_bots"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "live_sessions" ADD CONSTRAINT "live_sessions_classroom_id_classrooms_id_fk" FOREIGN KEY ("classroom_id") REFERENCES "public"."classrooms"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "live_sessions" ADD CONSTRAINT "live_sessions_lesson_id_lessons_id_fk" FOREIGN KEY ("lesson_id") REFERENCES "public"."lessons"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "parent_child_links" ADD CONSTRAINT "parent_child_links_parent_id_users_id_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "parent_child_links" ADD CONSTRAINT "parent_child_links_student_id_users_id_fk" FOREIGN KEY ("student_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "replay_bookmarks" ADD CONSTRAINT "replay_bookmarks_replay_id_replays_id_fk" FOREIGN KEY ("replay_id") REFERENCES "public"."replays"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "replay_bookmarks" ADD CONSTRAINT "replay_bookmarks_student_id_users_id_fk" FOREIGN KEY ("student_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "replay_teacher_questions" ADD CONSTRAINT "replay_teacher_questions_replay_id_replays_id_fk" FOREIGN KEY ("replay_id") REFERENCES "public"."replays"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "replay_teacher_questions" ADD CONSTRAINT "replay_teacher_questions_student_id_users_id_fk" FOREIGN KEY ("student_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "replay_watch_progress" ADD CONSTRAINT "replay_watch_progress_replay_id_replays_id_fk" FOREIGN KEY ("replay_id") REFERENCES "public"."replays"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "replay_watch_progress" ADD CONSTRAINT "replay_watch_progress_student_id_users_id_fk" FOREIGN KEY ("student_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "replays" ADD CONSTRAINT "replays_lesson_id_lessons_id_fk" FOREIGN KEY ("lesson_id") REFERENCES "public"."lessons"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "replays" ADD CONSTRAINT "replays_bot_id_class_bots_id_fk" FOREIGN KEY ("bot_id") REFERENCES "public"."class_bots"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "wellbeing_snapshots" ADD CONSTRAINT "wellbeing_snapshots_student_id_users_id_fk" FOREIGN KEY ("student_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "assignment_questions_assignment_idx" ON "assignment_questions" USING btree ("assignment_id");--> statement-breakpoint
CREATE UNIQUE INDEX "assignment_questions_order_uq" ON "assignment_questions" USING btree ("assignment_id","order");--> statement-breakpoint
CREATE INDEX "assignments_student_idx" ON "assignments" USING btree ("student_id");--> statement-breakpoint
CREATE INDEX "assignments_bot_idx" ON "assignments" USING btree ("bot_id");--> statement-breakpoint
CREATE INDEX "assignments_state_idx" ON "assignments" USING btree ("state");--> statement-breakpoint
CREATE INDEX "bot_curriculum_units_bot_idx" ON "bot_curriculum_units" USING btree ("bot_id");--> statement-breakpoint
CREATE INDEX "bot_questions_session_idx" ON "bot_questions" USING btree ("live_session_id");--> statement-breakpoint
CREATE INDEX "chat_messages_bot_student_idx" ON "chat_messages" USING btree ("bot_id","student_id");--> statement-breakpoint
CREATE INDEX "class_bots_subject_idx" ON "class_bots" USING btree ("subject");--> statement-breakpoint
CREATE INDEX "crisis_alerts_student_idx" ON "crisis_alerts" USING btree ("student_id");--> statement-breakpoint
CREATE INDEX "crisis_alerts_resolved_idx" ON "crisis_alerts" USING btree ("resolved");--> statement-breakpoint
CREATE UNIQUE INDEX "emotion_checkins_student_date_uq" ON "emotion_checkins" USING btree ("student_id","date");--> statement-breakpoint
CREATE INDEX "enrollments_student_idx" ON "enrollments" USING btree ("student_id");--> statement-breakpoint
CREATE INDEX "enrollments_classroom_idx" ON "enrollments" USING btree ("classroom_id");--> statement-breakpoint
CREATE INDEX "grading_history_student_idx" ON "grading_history" USING btree ("student_id");--> statement-breakpoint
CREATE INDEX "grading_items_status_idx" ON "grading_items" USING btree ("status");--> statement-breakpoint
CREATE INDEX "grading_items_student_idx" ON "grading_items" USING btree ("student_id");--> statement-breakpoint
CREATE INDEX "lessons_bot_idx" ON "lessons" USING btree ("bot_id");--> statement-breakpoint
CREATE INDEX "lessons_status_idx" ON "lessons" USING btree ("status");--> statement-breakpoint
CREATE INDEX "live_quizzes_session_idx" ON "live_quizzes" USING btree ("live_session_id");--> statement-breakpoint
CREATE INDEX "live_sessions_status_idx" ON "live_sessions" USING btree ("status");--> statement-breakpoint
CREATE INDEX "parent_child_links_student_idx" ON "parent_child_links" USING btree ("student_id");--> statement-breakpoint
CREATE INDEX "replay_bookmarks_replay_idx" ON "replay_bookmarks" USING btree ("replay_id");--> statement-breakpoint
CREATE INDEX "replay_teacher_questions_replay_idx" ON "replay_teacher_questions" USING btree ("replay_id");--> statement-breakpoint
CREATE INDEX "replays_bot_idx" ON "replays" USING btree ("bot_id");--> statement-breakpoint
CREATE INDEX "replays_status_idx" ON "replays" USING btree ("status");--> statement-breakpoint
CREATE INDEX "reports_kind_idx" ON "reports" USING btree ("kind");--> statement-breakpoint
CREATE INDEX "reports_status_idx" ON "reports" USING btree ("status");--> statement-breakpoint
CREATE INDEX "templates_kind_idx" ON "templates" USING btree ("kind");--> statement-breakpoint
CREATE INDEX "users_role_idx" ON "users" USING btree ("role");