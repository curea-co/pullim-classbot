/**
 * 풀림 클래스봇 — Drizzle Postgres 스키마.
 *
 * - 24개 테이블 (proc/spec/2026-05-18_be-api-design.md §2)
 * - 단순화 원칙: 1:1 종속 메타는 JSONB로 흡수, 1:N은 별도 테이블.
 * - mock 시각 라벨("오늘 19:50")은 BE에 저장하지 않음 — `started_at` 같은 timestamp만 저장.
 *   FE가 KST 라벨로 포맷. Ph2 seed는 라벨이 필요한 곳에 한해 별도 컬럼(`*_label`)을 둠.
 */

import {
  boolean,
  doublePrecision,
  index,
  integer,
  jsonb,
  pgTable,
  primaryKey,
  serial,
  text,
  timestamp,
  uniqueIndex,
} from 'drizzle-orm/pg-core';
import { relations, sql } from 'drizzle-orm';

/* ============================================================
 *  A. Identity
 * ========================================================== */

export const users = pgTable(
  'users',
  {
    id: text('id').primaryKey(),
    name: text('name').notNull(),
    role: text('role', { enum: ['student', 'teacher', 'parent'] }).notNull(),
    /** role-specific 메타 — Persona / teacher meta / parent contact를 흡수 */
    profile: jsonb('profile').$type<Record<string, unknown>>().notNull().default({}),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({
    byRole: index('users_role_idx').on(t.role),
  }),
);

export const parentChildLinks = pgTable(
  'parent_child_links',
  {
    parentId: text('parent_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
    studentId: text('student_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
    relation: text('relation', { enum: ['mother', 'father', 'guardian'] }).notNull(),
    primary: boolean('primary').notNull().default(false),
    phone: text('phone'),
    kakaoId: text('kakao_id'),
  },
  (t) => ({
    pk: primaryKey({ columns: [t.parentId, t.studentId] }),
    byStudent: index('parent_child_links_student_idx').on(t.studentId),
  }),
);

export const consentLogs = pgTable('consent_logs', {
  id: text('id').primaryKey(),
  parentId: text('parent_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  studentId: text('student_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  type: text('type', {
    enum: ['weekly_report', 'monthly_report', 'weak_nodes', 'emotion_share', 'realtime_alert'],
  }).notNull(),
  grantedAt: timestamp('granted_at', { withTimezone: true }).notNull(),
  expiresAt: timestamp('expires_at', { withTimezone: true }),
  scopeLabel: text('scope_label').notNull(),
});

/* ============================================================
 *  B. Bots & Classrooms
 * ========================================================== */

export const classrooms = pgTable('classrooms', {
  id: text('id').primaryKey(),
  label: text('label').notNull(),
  organization: text('organization').notNull(),
  teacherId: text('teacher_id').references(() => users.id, { onDelete: 'set null' }),
});

export const classBots = pgTable(
  'class_bots',
  {
    id: text('id').primaryKey(),
    name: text('name').notNull(),
    avatarEmoji: text('avatar_emoji').notNull().default('🤖'),
    teacherId: text('teacher_id').references(() => users.id, { onDelete: 'set null' }),
    teacherName: text('teacher_name').notNull(),
    organization: text('organization').notNull(),
    subject: text('subject').notNull(),
    grade: text('grade').notNull(),
    tone: text('tone', { enum: ['정중', '친근', '스파르타', '차분', '열정'] }).notNull(),
    greeting: text('greeting').notNull(),
    scope: integer('scope').notNull().default(3),
    isLive: boolean('is_live').notNull().default(false),
    /** {title, chapter, startedAt, durationMin, studentCount} 등 — 라이브 중일 때만 */
    currentLesson: jsonb('current_lesson').$type<Record<string, unknown> | null>(),
    /** [{text, expectedReplyKey}, ...] */
    quickPrompts: jsonb('quick_prompts').$type<Array<{ text: string; expectedReplyKey: string }>>()
      .notNull()
      .default(sql`'[]'::jsonb`),
    enrolledCount: integer('enrolled_count').notNull().default(0),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({
    bySubject: index('class_bots_subject_idx').on(t.subject),
  }),
);

export const enrollments = pgTable(
  'enrollments',
  {
    botId: text('bot_id').notNull().references(() => classBots.id, { onDelete: 'cascade' }),
    studentId: text('student_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
    classroomId: text('classroom_id').notNull().references(() => classrooms.id, { onDelete: 'cascade' }),
    classroomLabel: text('classroom_label').notNull(),
    assignedBy: text('assigned_by').notNull(),
    assignedAt: timestamp('assigned_at', { withTimezone: true }).notNull(),
    via: text('via').notNull(),
  },
  (t) => ({
    pk: primaryKey({ columns: [t.botId, t.studentId] }),
    byStudent: index('enrollments_student_idx').on(t.studentId),
    byClassroom: index('enrollments_classroom_idx').on(t.classroomId),
  }),
);

export const botCurriculumUnits = pgTable(
  'bot_curriculum_units',
  {
    id: text('id').primaryKey(),
    botId: text('bot_id').notNull().references(() => classBots.id, { onDelete: 'cascade' }),
    label: text('label').notNull(),
    fullPath: text('full_path').notNull(),
    achievementCodes: jsonb('achievement_codes').$type<string[]>().notNull().default([]),
  },
  (t) => ({
    byBot: index('bot_curriculum_units_bot_idx').on(t.botId),
  }),
);

export const botSettings = pgTable('bot_settings', {
  botId: text('bot_id').primaryKey().references(() => classBots.id, { onDelete: 'cascade' }),
  /** identity / voice / curriculum / teaching / scope / evaluation / safety / integration */
  settings: jsonb('settings').$type<Record<string, unknown>>().notNull().default({}),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
});

/* ============================================================
 *  C. Lessons & Live
 * ========================================================== */

export const lessons = pgTable(
  'lessons',
  {
    id: text('id').primaryKey(),
    botId: text('bot_id').notNull().references(() => classBots.id, { onDelete: 'cascade' }),
    classroomId: text('classroom_id').references(() => classrooms.id, { onDelete: 'set null' }),
    title: text('title').notNull(),
    chapter: text('chapter').notNull(),
    /** "19:00" / "내일 19:00" 같은 표시 라벨 — mock에서 그대로 가져옴 */
    startLabel: text('start_label').notNull(),
    scheduledStart: timestamp('scheduled_start', { withTimezone: true }),
    durationMin: integer('duration_min'),
    status: text('status', { enum: ['upcoming', 'live', 'ended'] }).notNull(),
    prepReady: doublePrecision('prep_ready').notNull().default(0),
    studentCount: integer('student_count').notNull().default(0),
    botName: text('bot_name'),
  },
  (t) => ({
    byBot: index('lessons_bot_idx').on(t.botId),
    byStatus: index('lessons_status_idx').on(t.status),
  }),
);

export const liveSessions = pgTable(
  'live_sessions',
  {
    id: text('id').primaryKey(),
    botId: text('bot_id').notNull().references(() => classBots.id, { onDelete: 'cascade' }),
    classroomId: text('classroom_id').references(() => classrooms.id, { onDelete: 'set null' }),
    lessonId: text('lesson_id').references(() => lessons.id, { onDelete: 'set null' }),
    botName: text('bot_name').notNull(),
    botEmoji: text('bot_emoji'),
    classroomLabel: text('classroom_label').notNull(),
    subject: text('subject').notNull(),
    status: text('status', { enum: ['live', 'starting', 'ended'] }).notNull(),
    startLabel: text('start_label').notNull(),
    startedAt: timestamp('started_at', { withTimezone: true }),
    endedAt: timestamp('ended_at', { withTimezone: true }),
    durationMin: integer('duration_min').notNull(),
    participantCount: integer('participant_count').notNull().default(0),
    totalCount: integer('total_count').notNull().default(0),
    scope: integer('scope').notNull().default(3),
    intensity: integer('intensity').notNull().default(0),
    alertCount: integer('alert_count').notNull().default(0),
    /** classroomStudents — 실시간 활동 히트맵·웰빙·정답률 */
    roster: jsonb('roster').$type<unknown[]>().notNull().default(sql`'[]'::jsonb`),
  },
  (t) => ({
    byStatus: index('live_sessions_status_idx').on(t.status),
  }),
);

export const liveQuizzes = pgTable(
  'live_quizzes',
  {
    id: text('id').primaryKey(),
    liveSessionId: text('live_session_id').references(() => liveSessions.id, { onDelete: 'set null' }),
    question: text('question').notNull(),
    type: text('type', { enum: ['mcq', 'short', 'ox', 'match'] }).notNull(),
    options: jsonb('options').$type<string[] | null>(),
    answerIndex: integer('answer_index'),
    distribution: jsonb('distribution').$type<number[] | null>(),
    responded: integer('responded').notNull().default(0),
    total: integer('total').notNull().default(0),
    correctRate: integer('correct_rate').notNull().default(0),
    scope: text('scope').notNull(),
    tier: text('tier', { enum: ['T1', 'T2', 'T3'] }).notNull(),
    status: text('status', { enum: ['live', 'closed', 'draft'] }).notNull(),
    startLabel: text('start_label').notNull(),
    remainingSec: integer('remaining_sec'),
  },
  (t) => ({
    bySession: index('live_quizzes_session_idx').on(t.liveSessionId),
  }),
);

export const botQuestions = pgTable(
  'bot_questions',
  {
    id: text('id').primaryKey(),
    liveSessionId: text('live_session_id').references(() => liveSessions.id, { onDelete: 'cascade' }),
    studentId: text('student_id').references(() => users.id, { onDelete: 'set null' }),
    studentName: text('student_name').notNull(),
    question: text('question').notNull(),
    scopeUsed: integer('scope_used').notNull(),
    shared: boolean('shared').notNull().default(false),
    botAnswerPreview: text('bot_answer_preview').notNull(),
    tier: text('tier', { enum: ['T1', 'T2', 'T3'] }).notNull(),
    agoMin: integer('ago_min').notNull().default(0),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({
    bySession: index('bot_questions_session_idx').on(t.liveSessionId),
  }),
);

/* ============================================================
 *  D. Replays
 * ========================================================== */

export const replays = pgTable(
  'replays',
  {
    id: text('id').primaryKey(),
    lessonId: text('lesson_id').references(() => lessons.id, { onDelete: 'set null' }),
    botId: text('bot_id').notNull().references(() => classBots.id, { onDelete: 'cascade' }),
    classroom: text('classroom').notNull(),
    title: text('title').notNull(),
    chapter: text('chapter').notNull(),
    botName: text('bot_name').notNull(),
    /** "2026-04-29" — yyyy-mm-dd */
    date: text('date').notNull(),
    startedAtLabel: text('started_at_label').notNull(),
    endedAtLabel: text('ended_at_label').notNull(),
    durationMin: integer('duration_min').notNull(),
    participantCount: integer('participant_count').notNull(),
    status: text('status', { enum: ['processing', 'review', 'sent'] }).notNull(),
    aiProcessedAtLabel: text('ai_processed_at_label'),
    sentAtLabel: text('sent_at_label'),
    myAccuracy: integer('my_accuracy').notNull().default(0),
    keyTakeaways: jsonb('key_takeaways').$type<string[]>().notNull().default([]),
    segments: jsonb('segments').$type<unknown[]>().notNull().default(sql`'[]'::jsonb`),
    transcript: jsonb('transcript').$type<unknown[]>().notNull().default(sql`'[]'::jsonb`),
    focusBins: jsonb('focus_bins').$type<number[]>().notNull().default([]),
    viewerStats: jsonb('viewer_stats').$type<Record<string, unknown> | null>(),
  },
  (t) => ({
    byBot: index('replays_bot_idx').on(t.botId),
    byStatus: index('replays_status_idx').on(t.status),
  }),
);

export const replayBookmarks = pgTable(
  'replay_bookmarks',
  {
    id: text('id').primaryKey(),
    replayId: text('replay_id').notNull().references(() => replays.id, { onDelete: 'cascade' }),
    studentId: text('student_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
    atSec: integer('at_sec').notNull(),
    label: text('label').notNull(),
    createdAtLabel: text('created_at_label').notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({
    byReplay: index('replay_bookmarks_replay_idx').on(t.replayId),
  }),
);

export const replayTeacherQuestions = pgTable(
  'replay_teacher_questions',
  {
    id: text('id').primaryKey(),
    replayId: text('replay_id').notNull().references(() => replays.id, { onDelete: 'cascade' }),
    studentId: text('student_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
    atSec: integer('at_sec').notNull(),
    text: text('text').notNull(),
    status: text('status', { enum: ['sent', 'replied'] }).notNull(),
    reply: text('reply'),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({
    byReplay: index('replay_teacher_questions_replay_idx').on(t.replayId),
  }),
);

export const replayWatchProgress = pgTable(
  'replay_watch_progress',
  {
    replayId: text('replay_id').notNull().references(() => replays.id, { onDelete: 'cascade' }),
    studentId: text('student_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
    lastSec: integer('last_sec').notNull().default(0),
    completed: boolean('completed').notNull().default(false),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({
    pk: primaryKey({ columns: [t.replayId, t.studentId] }),
  }),
);

/* ============================================================
 *  E. Assignments & Chat
 * ========================================================== */

export const assignments = pgTable(
  'assignments',
  {
    id: text('id').primaryKey(),
    botId: text('bot_id').notNull().references(() => classBots.id, { onDelete: 'cascade' }),
    studentId: text('student_id').references(() => users.id, { onDelete: 'set null' }),
    title: text('title').notNull(),
    scope: text('scope').notNull(),
    subject: text('subject').notNull(),
    grade: text('grade').notNull(),
    chapterFrom: text('chapter_from').notNull(),
    chapterTo: text('chapter_to').notNull(),
    achievementCodes: jsonb('achievement_codes').$type<string[]>().notNull().default([]),
    questionCount: integer('question_count').notNull(),
    difficulty: text('difficulty', { enum: ['하', '중', '상'] }).notNull(),
    mode: text('mode', { enum: ['practice', 'exam', 'wrong-conquest'] }).notNull(),
    scopeOverride: integer('scope_override'),
    source: text('source', { enum: ['teacher-assigned', 'bot-prescribed', 'self'] }).notNull(),
    assignedBy: text('assigned_by').notNull(),
    assignedAtLabel: text('assigned_at_label').notNull(),
    dueLabel: text('due_label').notNull(),
    dDay: text('d_day').notNull(),
    completedCount: integer('completed_count').notNull().default(0),
    recentAccuracy: integer('recent_accuracy'),
    state: text('state', { enum: ['todo', 'in-progress', 'submitted', 'overdue'] }).notNull(),
    reasonHint: text('reason_hint'),
    solveHref: text('solve_href').notNull(),
  },
  (t) => ({
    byStudent: index('assignments_student_idx').on(t.studentId),
    byBot: index('assignments_bot_idx').on(t.botId),
    byState: index('assignments_state_idx').on(t.state),
  }),
);

export const assignmentQuestions = pgTable(
  'assignment_questions',
  {
    id: text('id').primaryKey(),
    assignmentId: text('assignment_id').notNull().references(() => assignments.id, { onDelete: 'cascade' }),
    order: integer('order').notNull(),
    type: text('type', { enum: ['mc', 'short', 'essay', 'numeric'] }).notNull(),
    prompt: text('prompt').notNull(),
    options: jsonb('options').$type<string[] | null>(),
    answerIndex: integer('answer_index'),
    answerKey: text('answer_key'),
    modelAnswer: text('model_answer'),
    hints: jsonb('hints').$type<string[] | null>(),
  },
  (t) => ({
    byAssignment: index('assignment_questions_assignment_idx').on(t.assignmentId),
    byOrder: uniqueIndex('assignment_questions_order_uq').on(t.assignmentId, t.order),
  }),
);

export const chatMessages = pgTable(
  'chat_messages',
  {
    id: text('id').primaryKey(),
    botId: text('bot_id').notNull().references(() => classBots.id, { onDelete: 'cascade' }),
    studentId: text('student_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
    role: text('role', { enum: ['student', 'bot'] }).notNull(),
    text: text('text').notNull(),
    replyKey: text('reply_key'),
    scopeUsed: integer('scope_used'),
    tier: text('tier', { enum: ['T1', 'T2', 'T3'] }),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({
    byBotStudent: index('chat_messages_bot_student_idx').on(t.botId, t.studentId),
  }),
);

/* ============================================================
 *  F. Grading
 * ========================================================== */

export const gradingItems = pgTable(
  'grading_items',
  {
    id: text('id').primaryKey(),
    studentId: text('student_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
    studentName: text('student_name').notNull(),
    assignmentTitle: text('assignment_title').notNull(),
    submittedAtLabel: text('submitted_at_label').notNull(),
    type: text('type', { enum: ['short', 'essay', 'numeric'] }).notNull(),
    topic: text('topic').notNull(),
    draftScore: integer('draft_score').notNull(),
    maxScore: integer('max_score').notNull(),
    tier: text('tier', { enum: ['T1', 'T2', 'T3'] }).notNull(),
    aiConfidence: integer('ai_confidence').notNull(),
    responsePreview: text('response_preview').notNull(),
    draftComment: text('draft_comment').notNull(),
    /** [{criterion, weight, score, reason}, ...] */
    rubric: jsonb('rubric').$type<Array<Record<string, unknown>>>().notNull().default([]),
    status: text('status', { enum: ['queue', 'reviewing', 'approved', 'overridden'] }).notNull(),
    overrideDelta: integer('override_delta'),
  },
  (t) => ({
    byStatus: index('grading_items_status_idx').on(t.status),
    byStudent: index('grading_items_student_idx').on(t.studentId),
  }),
);

export const gradingHistory = pgTable(
  'grading_history',
  {
    id: serial('id').primaryKey(),
    studentId: text('student_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
    assignmentTitle: text('assignment_title').notNull(),
    gradedAtLabel: text('graded_at_label').notNull(),
    score: integer('score').notNull(),
    maxScore: integer('max_score').notNull(),
  },
  (t) => ({
    byStudent: index('grading_history_student_idx').on(t.studentId),
  }),
);

/* ============================================================
 *  G. Wellbeing
 * ========================================================== */

export const emotionCheckIns = pgTable(
  'emotion_checkins',
  {
    id: text('id').primaryKey(),
    studentId: text('student_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
    /** ISO yyyy-mm-dd */
    date: text('date').notNull(),
    mood: integer('mood').notNull(),
    intensity: integer('intensity'),
    intensityRange: jsonb('intensity_range').$type<[number, number] | null>(),
    freeText: text('free_text'),
    keywordFlag: text('keyword_flag', { enum: ['suicidal', 'depression', 'bullying'] }),
  },
  (t) => ({
    uniqStudentDate: uniqueIndex('emotion_checkins_student_date_uq').on(t.studentId, t.date),
  }),
);

export const wellbeingSnapshots = pgTable(
  'wellbeing_snapshots',
  {
    studentId: text('student_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
    date: text('date').notNull(),
    score: integer('score').notNull(),
    flag: text('flag', { enum: ['below-60-3days', 'below-40-instant'] }),
  },
  (t) => ({
    pk: primaryKey({ columns: [t.studentId, t.date] }),
  }),
);

export const crisisAlerts = pgTable(
  'crisis_alerts',
  {
    id: text('id').primaryKey(),
    studentId: text('student_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
    triggerType: text('trigger_type', { enum: ['keyword', 'wellbeing-threshold', 'manual'] }).notNull(),
    severity: integer('severity').notNull(),
    detectedAtLabel: text('detected_at_label').notNull(),
    detectedAt: timestamp('detected_at', { withTimezone: true }).notNull().defaultNow(),
    summary: text('summary').notNull(),
    notifiedTeacher: boolean('notified_teacher').notNull().default(false),
    notifiedParent: boolean('notified_parent').notNull().default(false),
    notifiedWeeCenter: boolean('notified_wee_center').notNull().default(false),
    resolved: boolean('resolved').notNull().default(false),
  },
  (t) => ({
    byStudent: index('crisis_alerts_student_idx').on(t.studentId),
    byResolved: index('crisis_alerts_resolved_idx').on(t.resolved),
  }),
);

/* ============================================================
 *  H. Reports & Marketplace
 * ========================================================== */

export const reports = pgTable(
  'reports',
  {
    id: text('id').primaryKey(),
    kind: text('kind', {
      enum: ['realtime', 'lesson-end', 'student', 'period', 'class', 'parent'],
    }).notNull(),
    title: text('title').notNull(),
    subject: text('subject').notNull(),
    generatedAtLabel: text('generated_at_label').notNull(),
    status: text('status', { enum: ['pending-approval', 'approved', 'sent', 'draft'] }).notNull(),
    kpis: jsonb('kpis').$type<Array<Record<string, unknown>>>().notNull().default([]),
    summary: text('summary').notNull(),
    alerts: jsonb('alerts').$type<string[]>().notNull().default([]),
  },
  (t) => ({
    byKind: index('reports_kind_idx').on(t.kind),
    byStatus: index('reports_status_idx').on(t.status),
  }),
);

export const templates = pgTable(
  'templates',
  {
    id: text('id').primaryKey(),
    kind: text('kind', { enum: ['bot', 'lesson', 'quiz'] }).notNull(),
    title: text('title').notNull(),
    authorName: text('author_name').notNull(),
    authorOrganization: text('author_organization').notNull(),
    isOfficial: boolean('is_official').notNull().default(false),
    /** "free" or {krw: 39000} */
    pricing: jsonb('pricing').$type<'free' | { krw: number }>().notNull(),
    subject: text('subject').notNull(),
    grade: text('grade').notNull(),
    downloads: integer('downloads').notNull().default(0),
    rating: doublePrecision('rating').notNull().default(0),
    ratingCount: integer('rating_count').notNull().default(0),
    description: text('description').notNull(),
    highlights: jsonb('highlights').$type<string[]>().notNull().default([]),
    updatedAtLabel: text('updated_at_label').notNull(),
    /** my upload 시 — published 외에는 마켓 노출 X */
    publishStatus: text('publish_status', { enum: ['draft', 'review', 'published'] })
      .notNull()
      .default('published'),
    earnings: integer('earnings'),
  },
  (t) => ({
    byKind: index('templates_kind_idx').on(t.kind),
  }),
);

/* ============================================================
 *  Relations — Drizzle query API
 * ========================================================== */

export const usersRelations = relations(users, ({ many }) => ({
  enrollments: many(enrollments),
  assignments: many(assignments),
  emotionCheckIns: many(emotionCheckIns),
  wellbeingSnapshots: many(wellbeingSnapshots),
  crisisAlerts: many(crisisAlerts),
  bookmarks: many(replayBookmarks),
  replayQuestions: many(replayTeacherQuestions),
  watchProgress: many(replayWatchProgress),
  gradingHistory: many(gradingHistory),
  chatMessages: many(chatMessages),
}));

export const classBotsRelations = relations(classBots, ({ many, one }) => ({
  enrollments: many(enrollments),
  curriculum: many(botCurriculumUnits),
  settings: one(botSettings, { fields: [classBots.id], references: [botSettings.botId] }),
  lessons: many(lessons),
  liveSessions: many(liveSessions),
  replays: many(replays),
  assignments: many(assignments),
}));

export const classroomsRelations = relations(classrooms, ({ many }) => ({
  enrollments: many(enrollments),
  lessons: many(lessons),
  liveSessions: many(liveSessions),
}));

export const enrollmentsRelations = relations(enrollments, ({ one }) => ({
  bot: one(classBots, { fields: [enrollments.botId], references: [classBots.id] }),
  student: one(users, { fields: [enrollments.studentId], references: [users.id] }),
  classroom: one(classrooms, { fields: [enrollments.classroomId], references: [classrooms.id] }),
}));

export const lessonsRelations = relations(lessons, ({ one, many }) => ({
  bot: one(classBots, { fields: [lessons.botId], references: [classBots.id] }),
  classroom: one(classrooms, { fields: [lessons.classroomId], references: [classrooms.id] }),
  liveSessions: many(liveSessions),
  replays: many(replays),
}));

export const liveSessionsRelations = relations(liveSessions, ({ one, many }) => ({
  bot: one(classBots, { fields: [liveSessions.botId], references: [classBots.id] }),
  classroom: one(classrooms, { fields: [liveSessions.classroomId], references: [classrooms.id] }),
  lesson: one(lessons, { fields: [liveSessions.lessonId], references: [lessons.id] }),
  quizzes: many(liveQuizzes),
  questions: many(botQuestions),
}));

export const liveQuizzesRelations = relations(liveQuizzes, ({ one }) => ({
  session: one(liveSessions, { fields: [liveQuizzes.liveSessionId], references: [liveSessions.id] }),
}));

export const botQuestionsRelations = relations(botQuestions, ({ one }) => ({
  session: one(liveSessions, { fields: [botQuestions.liveSessionId], references: [liveSessions.id] }),
  student: one(users, { fields: [botQuestions.studentId], references: [users.id] }),
}));

export const replaysRelations = relations(replays, ({ one, many }) => ({
  bot: one(classBots, { fields: [replays.botId], references: [classBots.id] }),
  lesson: one(lessons, { fields: [replays.lessonId], references: [lessons.id] }),
  bookmarks: many(replayBookmarks),
  teacherQuestions: many(replayTeacherQuestions),
  watchProgress: many(replayWatchProgress),
}));

export const replayBookmarksRelations = relations(replayBookmarks, ({ one }) => ({
  replay: one(replays, { fields: [replayBookmarks.replayId], references: [replays.id] }),
  student: one(users, { fields: [replayBookmarks.studentId], references: [users.id] }),
}));

export const replayTeacherQuestionsRelations = relations(replayTeacherQuestions, ({ one }) => ({
  replay: one(replays, { fields: [replayTeacherQuestions.replayId], references: [replays.id] }),
  student: one(users, { fields: [replayTeacherQuestions.studentId], references: [users.id] }),
}));

export const replayWatchProgressRelations = relations(replayWatchProgress, ({ one }) => ({
  replay: one(replays, { fields: [replayWatchProgress.replayId], references: [replays.id] }),
  student: one(users, { fields: [replayWatchProgress.studentId], references: [users.id] }),
}));

export const assignmentsRelations = relations(assignments, ({ one, many }) => ({
  bot: one(classBots, { fields: [assignments.botId], references: [classBots.id] }),
  student: one(users, { fields: [assignments.studentId], references: [users.id] }),
  questions: many(assignmentQuestions),
}));

export const assignmentQuestionsRelations = relations(assignmentQuestions, ({ one }) => ({
  assignment: one(assignments, { fields: [assignmentQuestions.assignmentId], references: [assignments.id] }),
}));

export const gradingItemsRelations = relations(gradingItems, ({ one }) => ({
  student: one(users, { fields: [gradingItems.studentId], references: [users.id] }),
}));

export const botCurriculumUnitsRelations = relations(botCurriculumUnits, ({ one }) => ({
  bot: one(classBots, { fields: [botCurriculumUnits.botId], references: [classBots.id] }),
}));

export const botSettingsRelations = relations(botSettings, ({ one }) => ({
  bot: one(classBots, { fields: [botSettings.botId], references: [classBots.id] }),
}));

export const chatMessagesRelations = relations(chatMessages, ({ one }) => ({
  bot: one(classBots, { fields: [chatMessages.botId], references: [classBots.id] }),
  student: one(users, { fields: [chatMessages.studentId], references: [users.id] }),
}));

/* ============================================================
 *  추론 타입 — `import { type User } from '@/lib/db/schema'`
 * ========================================================== */

export type User = typeof users.$inferSelect;
export type NewUser = typeof users.$inferInsert;
export type ParentChildLink = typeof parentChildLinks.$inferSelect;
export type ConsentLog = typeof consentLogs.$inferSelect;
export type Classroom = typeof classrooms.$inferSelect;
export type ClassBotRow = typeof classBots.$inferSelect;
export type Enrollment = typeof enrollments.$inferSelect;
export type BotCurriculumUnitRow = typeof botCurriculumUnits.$inferSelect;
export type BotSettingsRow = typeof botSettings.$inferSelect;
export type LessonRow = typeof lessons.$inferSelect;
export type LiveSessionRow = typeof liveSessions.$inferSelect;
export type LiveQuizRow = typeof liveQuizzes.$inferSelect;
export type BotQuestionRow = typeof botQuestions.$inferSelect;
export type ReplayRow = typeof replays.$inferSelect;
export type ReplayBookmarkRow = typeof replayBookmarks.$inferSelect;
export type ReplayTeacherQuestionRow = typeof replayTeacherQuestions.$inferSelect;
export type ReplayWatchProgressRow = typeof replayWatchProgress.$inferSelect;
export type AssignmentRow = typeof assignments.$inferSelect;
export type AssignmentQuestionRow = typeof assignmentQuestions.$inferSelect;
export type ChatMessageRow = typeof chatMessages.$inferSelect;
export type GradingItemRow = typeof gradingItems.$inferSelect;
export type GradingHistoryRow = typeof gradingHistory.$inferSelect;
export type EmotionCheckInRow = typeof emotionCheckIns.$inferSelect;
export type WellbeingSnapshotRow = typeof wellbeingSnapshots.$inferSelect;
export type CrisisAlertRow = typeof crisisAlerts.$inferSelect;
export type ReportRow = typeof reports.$inferSelect;
export type TemplateRow = typeof templates.$inferSelect;
