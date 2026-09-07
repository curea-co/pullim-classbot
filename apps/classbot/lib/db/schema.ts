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
  date,
  doublePrecision,
  foreignKey,
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

export const classrooms = pgTable(
  'classrooms',
  {
    id: text('id').primaryKey(),
    label: text('label').notNull(),
    organization: text('organization').notNull(),
    teacherId: text('teacher_id').references(() => users.id, { onDelete: 'set null' }),
  },
  (t) => ({
    // join_codes 의 (classroom_id, teacher_id) 복합 FK 대상 — 소유권 정합을 DB 로 강제
    idTeacherUq: uniqueIndex('classrooms_id_teacher_uq').on(t.id, t.teacherId),
  }),
);

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
    /**
     * 마켓 게시 여부 — 마켓 목록이 **이 컬럼으로 필터**한다.
     * JSONB(설정 뭉치)에 숨기면 목록 조회가 매번 문서를 풀어야 해서 컬럼으로 뺐다.
     */
    isPublished: boolean('is_published').notNull().default(false),
    /** 실제 게시 시점. 내리면 다시 null — 스테일 타임스탬프를 남기지 않는다. */
    publishedAt: timestamp('published_at', { withTimezone: true }),
    /** 마켓 카드 한 줄 소개(200자 이내). 교사가 게시할 때 쓴다. */
    publishBlurb: text('publish_blurb'),
  },
  (t) => ({
    bySubject: index('class_bots_subject_idx').on(t.subject),
    // join_codes 의 (bot_id, teacher_id) 복합 FK 대상 — 소유권 정합을 DB 로 강제
    idTeacherUq: uniqueIndex('class_bots_id_teacher_uq').on(t.id, t.teacherId),
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

/**
 * 스스로 담은 봇 — 마켓에서 학생이 직접 골라 자기 목록에 넣은 봇 (자기주도 계약 §1).
 *
 * `enrollments` 와 **PK 모양을 맞춘다**(bot_id, student_id). 「이미 담았나」 검사가 「이미
 * 참여했나」와 같은 형태로 읽혀야 두 경로를 나란히 두고도 헷갈리지 않는다.
 *
 * `classroom_id` · `classroom_label` · `assigned_by` · `via` · `assigned_at` 을 **일부러
 * 두지 않았다.** 그 다섯은 「누가 어디로 넣어 줬다」를 뜻하는데, 자기주도에는 준 사람도
 * 들어간 곳도 없다. `added_at` 은 `assigned_at` 의 개명이 아니다 — 아무도 배정하지 않았다.
 * `source` 컬럼도 없다 — 이 테이블의 모든 행은 실재하는 `class_bots.id` 를 가리킨다.
 *
 * `is_published` 는 **담는 순간에만** 본다(라우트가 마켓과 같은 술어로 거른다). 이미 담긴
 * 행은 그 봇의 게시가 나중에 내려가도 그대로 남는다 — 「지금 마켓에 있는가」와 「그때
 * 담았는가」는 다른 사실이고, 학생이 쓰던 튜터가 교사의 게시 해제로 조용히 사라지면 안 된다.
 * 그래서 이 테이블에는 그 조건이 없고, **읽기 쪽에도 더하면 안 된다**(더하는 순간 담아 둔
 * 봇이 목록에서 증발한다). 이 테이블이 지키는 것은 FK — 「실재하는 봇인가」 하나뿐이다.
 */
export const selfEnrollments = pgTable(
  'self_enrollments',
  {
    botId: text('bot_id').notNull().references(() => classBots.id, { onDelete: 'cascade' }),
    studentId: text('student_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
    addedAt: timestamp('added_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({
    pk: primaryKey({ columns: [t.botId, t.studentId] }),
    // 읽기는 언제나 「내가 담은 것」이라 student_id 단독 조회가 유일한 조회 축이다.
    byStudent: index('self_enrollments_student_idx').on(t.studentId),
  }),
);

/**
 * 공부한 날 — 자기주도로 학습한 **날짜**를 하루 한 줄로 쌓는다 (자기주도 계약 §1).
 *
 * **숫자를 저장하지 않는다.** 연속일수는 읽을 때 날짜에서 계산한다(`deriveStreak`) —
 * 저장된 카운터는 어느 날들로 그 수가 나왔는지 알 수 없어 검증도 복구도 안 된다.
 * 날짜가 정본이고 연속일수는 파생이다.
 *
 * `study_date` 는 **KST 기준의 하루**다. 서버가 「오늘」을 정하는 곳은 한 군데
 * (`app/api/_lib/study-date.ts` 의 `kstToday()`)이고, 그 하루의 경계는 브라우저가 쓰는
 * 로컬 자정(`lib/store/today-key.ts`)과 **한국에서 같은 자리**에 있다.
 *
 * ⚠️ **이 컬럼을 그대로 select 하지 마라.** 타입은 `string` 이지만 node-postgres 는
 * DATE(oid 1082)를 **로컬시간 `Date` 객체로 파싱**해서 돌려준다(`postgres-date`) —
 * 타입과 런타임이 어긋나고, 서버 TZ 가 KST 가 아니면 하루가 밀린다. 읽는 쪽은 언제나
 * `to_char(study_date, 'YYYY-MM-DD')` 로 **캐스팅해서** 읽는다(라우트 참조).
 *
 * `origin` 이 있는 이유: 백필된 날은 **학생 기기가 준 기록**이라, 그날 앱에서 실제로
 * 학습해 서버가 받은 날과 신뢰도가 다르다. 학부모에게 보일 때 이 구분이 필요해진다.
 * 지금 화면에 내보내지는 않는다 — 컬럼만 정확히 남긴다. 그리고 **'app' 이 'backfill' 로
 * 되돌아가는 경로는 없다**(백필 삽입은 `onConflictDoNothing`).
 */
export const selfStudyDays = pgTable(
  'self_study_days',
  {
    studentId: text('student_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
    /** `'YYYY-MM-DD'`(KST 기준의 하루). 읽기는 위 ⚠️ 대로 to_char 캐스팅으로. */
    studyDate: date('study_date', { mode: 'string' }).notNull(),
    /** 'app' = 그날 앱에서 받은 기록 · 'backfill' = 학생 기기가 나중에 올린 기록. */
    origin: text('origin', { enum: ['app', 'backfill'] }).notNull().default('app'),
  },
  (t) => ({
    // 읽기는 언제나 「내가 공부한 날」이라 student_id 단독 조회가 유일한 조회 축인데,
    // **그 축은 이 PK 가 이미 덮는다**(선행 컬럼이 student_id 라 같은 btree 로 찾는다).
    // 그래서 `self_enrollments` 와 달리 student_id 보조 인덱스를 두지 않는다 — 저 테이블은
    // PK 가 (bot_id, student_id) 라서 학생 축이 선행이 아니고, 그래서 보조 인덱스가 필요했다.
    // 여기에 같은 모양을 따라 두면 쓰기 비용만 영원히 물고, 다음 사람은 「내가 못 보는 이유가
    // 있나」를 먼저 의심하게 된다.
    pk: primaryKey({ columns: [t.studentId, t.studyDate] }),
  }),
);

/**
 * 클래스 참여 코드 — mock `class-codes.ts` CODE_MAP 의 실전판 (실출시 M2).
 * 학생이 코드를 입력하면 code → (bot, classroom) 을 해석해 enrollment 를 생성한다.
 *
 * 소유권 무결성 — 정확한 보장 범위(spec 개정 `2026-07-03_be-api-m2-amendment.md`):
 * teacher_id 가 **채워진** 코드에 한해 (bot_id, teacher_id)·(classroom_id, teacher_id) 복합
 * FK(부모 (id, teacher_id) unique 참조)가 "봇·반이 같은 교사 소유"를 DB 로 강제한다(Codex #190).
 * teacher_id = NULL 은 복합 FK 를 우회하는 ownerless 상태 — **교사 user 삭제 시 ON UPDATE
 * CASCADE 로만 도달하는 것이 의도**(부모 SET NULL 정책 정합, 삭제 비차단. R3/R4). 발급
 * 엔드포인트(POST /api/bots/{id}/join-codes)는 소유권 검증 후 teacher_id 를 필수 기록한다.
 */
export const joinCodes = pgTable(
  'join_codes',
  {
    code: text('code').primaryKey(),
    botId: text('bot_id').notNull(),
    classroomId: text('classroom_id').notNull(),
    teacherId: text('teacher_id'),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({
    byBot: index('join_codes_bot_idx').on(t.botId),
    botOwnerFk: foreignKey({
      columns: [t.botId, t.teacherId],
      foreignColumns: [classBots.id, classBots.teacherId],
      name: 'join_codes_bot_owner_fk',
    }).onDelete('cascade').onUpdate('cascade'),
    classroomOwnerFk: foreignKey({
      columns: [t.classroomId, t.teacherId],
      foreignColumns: [classrooms.id, classrooms.teacherId],
      name: 'join_codes_classroom_owner_fk',
    }).onDelete('cascade').onUpdate('cascade'),
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
    /* ── M2 발사(dispatch) 필드 (spec 개정 2026-07-03_be-assignment-submissions-ddl.md §3) ── */
    /** 다중 지정 대상 — FE 규약 단일화: **빈 배열 = 전체 enrolled**, [id,…]=지정 (null 이중표현 금지) */
    targetStudentIds: jsonb('target_student_ids').$type<string[]>().notNull().default(sql`'[]'::jsonb`),
    /** 발사 상태 — FE UserAssignment.dispatchStatus 계약(M2 는 발사 즉시 sent; draft/scheduled round-trip 은 후속) */
    dispatchStatus: text('dispatch_status', { enum: ['draft', 'sent', 'scheduled', 'withdrawn'] })
      .notNull()
      .default('sent'),
    /** 발사 교사 — 제출 현황 접근 검증의 권위(봇 소유 역산 대신 직접 기록).
     *  nullable 은 교사 user 삭제 SET NULL 정책(classrooms/class_bots.teacher_id 와 동일) —
     *  발사 경로(BE POST /api/assignments)는 항상 기록한다(join_codes.teacher_id 와 같은 계약). */
    createdBy: text('created_by').references(() => users.id, { onDelete: 'set null' }),
    /** 발사 시각 — 목록 정렬 키(id 는 uuid 라 비시간순). DEFAULT 없음: draft/scheduled 행이
     *  발사된 것처럼 보이지 않도록 **실제 발사(sent 전이) 시점에만** BE 가 명시 기록한다(Codex #192 R2). */
    dispatchedAt: timestamp('dispatched_at', { withTimezone: true }),
    /** 시험 모드 제한 시간(분) — FE UserAssignment.examTimeLimitMin */
    examTimeLimitMin: integer('exam_time_limit_min'),
    /** 오답 재발사 문항 id 집합 — 문항 콘텐츠 영속은 M3, 키만 보존 */
    requizQuestionIds: jsonb('requiz_question_ids').$type<string[] | null>(),
  },
  (t) => ({
    byStudent: index('assignments_student_idx').on(t.studentId),
    byBot: index('assignments_bot_idx').on(t.botId),
    byState: index('assignments_state_idx').on(t.state),
    byDispatchedAt: index('assignments_dispatched_at_idx').on(t.dispatchedAt),
  }),
);

/**
 * 학생 제출 — FE `recordSubmission`(동일 assignment+student upsert) 의미의 실전판.
 * (BE assignment 모듈이 소비 — DDL 제안: proc/spec/2026-07-03_be-assignment-submissions-ddl.md §2)
 *
 * 계약 범위: 이 테이블은 **최종 제출 스냅샷**이다(FE Submission 1:1). 풀이 진행 라이프사이클
 * (임시저장·startedAt·lastPosition·시험 이탈 카운트, spec 12 §5)은 solve-세션 영속(M3+)에서
 * 별도 attempt/session 테이블로 다룬다 — 여기 컬럼을 선점하지 않는다. 채점 상태 전이는
 * 기존 grading_items 소관.
 */
export const submissions = pgTable(
  'submissions',
  {
    id: text('id').primaryKey(),
    assignmentId: text('assignment_id').notNull()
      .references(() => assignments.id, { onDelete: 'cascade' }),
    studentId: text('student_id').notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    submittedAt: timestamp('submitted_at', { withTimezone: true }).notNull().defaultNow(),
    /** { [questionId]: answer } — FE Submission.answers 그대로 */
    answers: jsonb('answers').$type<Record<string, string>>().notNull().default({}),
    /** 0~100 정수 (FE computeMockScore 산출) */
    scorePercent: integer('score_percent').notNull(),
  },
  (t) => ({
    // 멱등 invariant — recordSubmission 의 "동일 assignment+student 는 갱신" 을 DB 로 강제
    byAssignmentStudent: uniqueIndex('submissions_assignment_student_uq')
      .on(t.assignmentId, t.studentId),
    byAssignment: index('submissions_assignment_idx').on(t.assignmentId),
    byStudent: index('submissions_student_idx').on(t.studentId),
  }),
);

/**
 * 교사 개입 이벤트 — FE `pullim-interventions` 스토어(InterventionEvent)의 실전판.
 * (spec: proc/spec/2026-07-02_classbot-teacher-intervention-design.md §3, 실출시 M2 BE 3/3)
 * 교사 표면(리마인드·코멘트·재발사·응원)이 쓰고, 학생 벨 인박스·결과 코멘트가 읽는다.
 */
export const interventions = pgTable(
  'interventions',
  {
    id: text('id').primaryKey(),
    type: text('type', { enum: ['remind', 'requiz', 'comment', 'crisis'] }).notNull(),
    botId: text('bot_id').notNull().references(() => classBots.id, { onDelete: 'cascade' }),
    studentId: text('student_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
    /** remind/comment 는 대상 과제, requiz 는 새 과제 — crisis 는 null */
    assignmentId: text('assignment_id').references(() => assignments.id, { onDelete: 'cascade' }),
    /** 발신 교사 — assignments.created_by 와 동일 계약(nullable = 교사 삭제 SET NULL, 발신 경로는 항상 기록) */
    createdBy: text('created_by').references(() => users.id, { onDelete: 'set null' }),
    /** 인박스에 그대로 표시할 문구 — 발신 시점에 완성해 저장. FE 타입은 message? 지만
     *  4개 쓰기 표면(리마인드·코멘트·재발사·응원) 전부 항상 완성문을 보내며, BE POST 는
     *  빈 message 를 400 으로 검증 — NOT NULL 이 인박스 렌더 무결성을 보장한다. */
    message: text('message').notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    readAt: timestamp('read_at', { withTimezone: true }),
  },
  (t) => ({
    // 학생 인박스(미읽음 배지) 조회 경로
    byStudent: index('interventions_student_idx').on(t.studentId, t.createdAt),
    // 결과 페이지 코멘트·과제별 리마인드 dedup 조회 경로
    byAssignment: index('interventions_assignment_idx').on(t.assignmentId),
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
  selfEnrollments: many(selfEnrollments),
  selfStudyDays: many(selfStudyDays),
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
  selfEnrollments: many(selfEnrollments),
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

export const selfEnrollmentsRelations = relations(selfEnrollments, ({ one }) => ({
  bot: one(classBots, { fields: [selfEnrollments.botId], references: [classBots.id] }),
  student: one(users, { fields: [selfEnrollments.studentId], references: [users.id] }),
}));

export const selfStudyDaysRelations = relations(selfStudyDays, ({ one }) => ({
  student: one(users, { fields: [selfStudyDays.studentId], references: [users.id] }),
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
export type SelfEnrollment = typeof selfEnrollments.$inferSelect;
export type SelfStudyDayRow = typeof selfStudyDays.$inferSelect;
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
