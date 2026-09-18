/**
 * 풀림 클래스봇 — mock → DB seed.
 *
 * - idempotent: 매 실행마다 모든 테이블 TRUNCATE RESTART IDENTITY CASCADE 후 재삽입.
 * - mock의 시각 라벨("오늘 19:50")은 그대로 *_label 컬럼에 저장, timestamp 컬럼은 명시적으로 채울 수 있는 곳만 채움.
 * - 실행: `bun run db:seed` (drizzle-kit migrate 이후).
 *
 * mock의 학생 id `s1`~`s18` 중 s1(서연)만 `student_001`로 변환하고, 나머지는 그대로 유지.
 * teacher id는 `teacher_001`~`teacher_005`로 새로 부여.
 */

import { config as loadEnv } from 'dotenv';

// .env.local 우선 (Next.js와 동일).
loadEnv({ path: '.env.local' });
loadEnv({ path: '.env' });

import { sql } from 'drizzle-orm';

import { getDb, getPool } from '../lib/db';
import { CODE_MAP } from '../lib/mock/class-codes';

// 시드는 실행 시점에 DATABASE_URL 이 설정돼 있어야 한다(런타임 연결).
const db = getDb();
import {
  assignmentQuestions,
  assignments,
  botCurriculumUnits,
  botQuestions,
  botSettings,
  classBots,
  classrooms,
  consentLogs,
  crisisAlerts,
  enrollments,
  joinCodes,
  gradingItems,
  lessons,
  liveQuizzes,
  liveSessions,
  parentChildLinks,
  replayBookmarks,
  replayTeacherQuestions,
  replayWatchProgress,
  replays,
  reports,
  templates,
  users,
} from '../lib/db/schema';

import { currentPersona } from '../lib/mock/persona';
import { childLinks, consentLog, currentParent } from '../lib/mock/family';
import { getOfficialTutor } from '../lib/mock/classbot-official';
import {
  botCurriculum,
  botSettings as mockBotSettings,
  classBots as mockClassBots,
  classRoster,
  crisisAlerts as mockCrisisAlerts,
  gradingQueue,
  liveFeed,
  liveSessions as mockLiveSessions,
  myTemplateUploads,
  overriddenSample,
  currentQuiz,
  quizDrafts,
  quizHistory,
  reports as mockReports,
  studentAssignments,
  assignmentQuestions as mockAssignmentQuestions,
  studentEnrollments,
  studentReplays,
  templates as mockTemplates,
  upcomingLessons,
  type ClassroomStudent,
} from '../lib/mock/classbot';

const ALL_TABLES = [
  // 부모 순서로 — TRUNCATE RESTART IDENTITY CASCADE는 의존관계 자동 처리하지만 순서 명시로 가독성 확보
  'grading_items',
  'crisis_alerts',
  'reports',
  'templates',
  'interventions',
  'submissions',
  'assignment_questions',
  'assignments',
  'replay_watch_progress',
  'replay_teacher_questions',
  'replay_bookmarks',
  'replays',
  'bot_questions',
  'live_quizzes',
  'live_sessions',
  'lessons',
  'bot_settings',
  'bot_curriculum_units',
  'enrollments',
  'join_codes',
  'class_bots',
  'classrooms',
  'consent_logs',
  'parent_child_links',
  'users',
];

/* ─── helpers ─────────────────────────────────────────────── */

/** mock의 's1' → 'student_001', 그 외 s2~s18 그대로 유지 */
function mapStudentId(raw: string): string {
  if (raw === 's1') return currentPersona.id; // 'student_001'
  return raw;
}

/** 봇별 teacher id 매핑 — mock에 teacher id가 없어 추론으로 부여 */
const BOT_TO_TEACHER: Record<string, string> = {
  cb_001: 'teacher_001', // 김보람
  cb_002: 'teacher_002', // 박서윤
  cb_003: 'teacher_003', // 정민호
  cb_004: 'teacher_004', // 최다인
  cb_005: 'teacher_005', // 강윤호
};

/**
 * 풀림 공식 기본 봇 셋 — 마켓에 늘 서 있어야 하는 봇 (`proc/spec/03 § 4.13.1`).
 *
 * **id 를 새로 짓는 까닭**: 값의 출처인 `ot_*` 는 은퇴한 mock 카탈로그 id 라 `class_bots`
 * 행의 id 로 쓸 수 없다. `cb_` 는 이 테이블의 규약이고(런타임 생성은 `cb_<uuid>`,
 * 데모는 `cb_demo_*`), 뒤에 `official_` 을 붙여 시드 봇(`cb_001`…)과도 섞이지 않게 한다.
 * `cb_demo_%` 와 겹치지 않는 것도 조건이다 — `demo-reset.ts` 가 그 접두로 게시를 내린다.
 */
const OFFICIAL_BOT_SEEDS: Array<{ id: string; tutorId: string }> = [
  { id: 'cb_official_math',    tutorId: 'ot_001' }, // 수학 마스터
  { id: 'cb_official_english', tutorId: 'ot_002' }, // 영어 마스터
  { id: 'cb_official_science', tutorId: 'ot_003' }, // 과학 마스터
];

/**
 * 공식 봇 게시 시각의 기준점 — **못박은 값이고 `new Date()` 가 아니다.**
 * 마켓 목록이 이 값의 내림차순이라, 실행 시각을 넣으면 **언제 시드를 돌렸느냐에 따라
 * 목록 차례가 달라진다.** 같은 시드는 언제 돌려도 같은 결과여야 한다.
 */
const OFFICIAL_PUBLISHED_AT_BASE = new Date('2026-09-16T00:00:00Z');

/**
 * 세 행에 **같은 시각을 주지 않는다 — 1초씩 어긋낸다.**
 *
 * 목록 라우트의 정렬은 `desc(published_at)` **하나뿐**이고 보조 키가 없다. 세 행이 같은 값을
 * 가지면 동률이라 **Postgres 가 돌려주는 차례가 실행마다 달라질 수 있다** — 값을 못박아
 * 얻으려던 「같은 시드는 같은 결과」가 정작 이 셋 사이에서 서지 않는다.
 *
 * 내림차순이므로 **먼저 세울 봇에 더 늦은 시각**을 준다 — 위 목록 차례(수학 → 영어 → 과학)가
 * 화면에 그대로 선다. 봇을 더하면 이 계산이 알아서 자리를 준다.
 */
function officialPublishedAt(index: number): Date {
  const lastIndex = OFFICIAL_BOT_SEEDS.length - 1;
  return new Date(OFFICIAL_PUBLISHED_AT_BASE.getTime() + (lastIndex - index) * 1000);
}

/**
 * 로컬 데모 DB 의 교사 다섯. 화면이 읽는 값이 아니라 **이 시더가 쓰는 자리 데이터**다.
 *
 * `teacher_001` 의 프로필(직함·소속·경력·봇 수·학생 수)은 `lib/mock/classbot.ts` 의
 * `currentTeacher` 에서 가져왔는데, 그 상수는 교사 화면들이 함께 읽는 바람에 **빈 계정에도
 * 「김보람 · 대치프리미엄 수학학원 · 활성 봇 3개 · 학생 47명」이 뜨게 만들고 있었다.**
 * 2026-09-18 에 그 상수를 걷으며, 시더가 쓰던 몫만 여기로 내렸다 — 시드 행은 로컬 DB 안에서만
 * 살고 화면 인사말이 되지 않는다.
 */
const DEMO_TEACHER_PROFILE = {
  title: '수학과 전임강사',
  organization: '대치프리미엄 수학학원',
  yearsOfExperience: 7,
  activeBots: 3,
  totalStudents: 47,
} as const;

const TEACHER_NAMES: Record<string, string> = {
  teacher_001: '김보람',
  teacher_002: '박서윤',
  teacher_003: '정민호',
  teacher_004: '최다인',
  teacher_005: '강윤호',
};

/** lessonId 라벨을 봇 id에 묶기 */
function lessonOwnerBot(lessonId: string): string {
  if (lessonId.startsWith('les_eng')) return 'cb_002';
  return 'cb_001';
}

/** liveSession.id → bot/classroom 매핑 — CODE_MAP(참여 코드)이 bot↔classroom 의 권위.
 *  (studentEnrollments 는 출시 빈 배열이라 의존 시 전부 cr_math_a 로 오연결됨, Codex #190 R5) */
function liveSessionBotAndClassroom(ls: { botName: string; classroom: string }) {
  const botEntry = mockClassBots.find((b) => b.name === ls.botName);
  const botId = botEntry?.id ?? 'cb_001';
  const codeTarget = Object.values(CODE_MAP).find((t) => t.botId === botId);
  const classroomId =
    codeTarget?.classroomId ??
    studentEnrollments.find((e) => e.botId === botId)?.classroomId ??
    'cr_math_a';
  return { botId, classroomId };
}

/* ─── main ────────────────────────────────────────────────── */

async function main() {
  // eslint-disable-next-line no-console
  console.log('[seed] start — DATABASE_URL =', process.env.DATABASE_URL);

  if (!process.env.DATABASE_URL) {
    throw new Error('DATABASE_URL is not set. Copy .env.example to .env.local.');
  }

  /* 1. TRUNCATE — idempotent reset */
  await db.execute(sql.raw(`TRUNCATE ${ALL_TABLES.join(', ')} RESTART IDENTITY CASCADE`));
  console.log(`[seed] truncated ${ALL_TABLES.length} tables`);

  /* 2. users — students + teachers + parent */

  const studentRows = classRoster.map((s: ClassroomStudent) => {
    const id = mapStudentId(s.id);
    const isHero = id === currentPersona.id;
    return {
      id,
      name: s.name,
      role: 'student' as const,
      profile: {
        ...(isHero ? currentPersona : {}),
        activityHeat: s.activityHeat,
        botQuestions: s.botQuestions,
        lastActiveMin: s.lastActiveMin,
        status: s.status,
        wellbeing: s.wellbeing,
        accuracy: s.accuracy,
        ...(s.alert ? { alert: s.alert } : {}),
      },
    };
  });

  const teacherRows = Object.entries(TEACHER_NAMES).map(([id, name]) => ({
    id,
    name,
    role: 'teacher' as const,
    profile: id === 'teacher_001' ? { ...DEMO_TEACHER_PROFILE } : {},
  }));

  const parentRows = [
    {
      id: currentParent.id,
      name: currentParent.name,
      role: 'parent' as const,
      profile: {
        relation: currentParent.relation,
        phone: currentParent.phone,
        kakaoId: currentParent.kakaoId,
      },
    },
  ];

  await db.insert(users).values([...studentRows, ...teacherRows, ...parentRows]);
  console.log(`[seed] users: ${studentRows.length + teacherRows.length + parentRows.length} rows`);

  /* 3. parent_child_links + consent_logs */

  await db.insert(parentChildLinks).values(
    childLinks.map((l) => ({
      parentId: l.parentId,
      studentId: mapStudentId(l.studentId),
      relation: currentParent.relation,
      primary: l.primary,
      phone: currentParent.phone,
      kakaoId: currentParent.kakaoId ?? null,
    })),
  );

  if (consentLog.length > 0) {
    await db.insert(consentLogs).values(
      consentLog.map((c) => ({
        id: c.id,
        parentId: c.parentId,
        studentId: mapStudentId(c.studentId),
        type: c.type,
        grantedAt: new Date(c.grantedAt),
        expiresAt: c.expiresAt ? new Date(c.expiresAt) : null,
        scopeLabel: c.scopeLabel,
      })),
    );
  }
  console.log(`[seed] parent_child_links: ${childLinks.length}, consent_logs: ${consentLog.length}`);

  /* 4. classrooms — 참여 코드(CODE_MAP)가 클래스룸의 권위. enrollment(출시 빈 배열)도 union. */
  const classroomMap = new Map<string, { label: string; org: string; teacherId: string }>();
  for (const [, target] of Object.entries(CODE_MAP)) {
    if (!classroomMap.has(target.classroomId)) {
      classroomMap.set(target.classroomId, {
        label: target.classroomLabel,
        org: target.via,
        teacherId: BOT_TO_TEACHER[target.botId] ?? 'teacher_001',
      });
    }
  }
  for (const e of studentEnrollments) {
    if (!classroomMap.has(e.classroomId)) {
      classroomMap.set(e.classroomId, {
        label: e.classroomLabel,
        org: e.via,
        teacherId: BOT_TO_TEACHER[e.botId] ?? 'teacher_001',
      });
    }
  }
  if (classroomMap.size > 0) {
    await db.insert(classrooms).values(
      Array.from(classroomMap.entries()).map(([id, v]) => ({
        id,
        label: v.label,
        organization: v.org,
        teacherId: v.teacherId,
      })),
    );
  }
  console.log(`[seed] classrooms: ${classroomMap.size}`);

  /* 5. class_bots */
  await db.insert(classBots).values(
    mockClassBots.map((b) => ({
      id: b.id,
      name: b.name,
      avatarEmoji: b.avatarEmoji,
      teacherId: BOT_TO_TEACHER[b.id] ?? 'teacher_001',
      teacherName: b.teacherName,
      organization: b.organization,
      subject: b.subject,
      grade: b.grade,
      tone: b.tone,
      greeting: b.greeting,
      scope: b.scope,
      isLive: b.isLive,
      currentLesson: b.currentLesson ?? null,
      quickPrompts: b.quickPrompts,
      enrolledCount: b.enrolledCount,
    })),
  );
  console.log(`[seed] class_bots: ${mockClassBots.length}`);

  /* 5b. class_bots — 풀림 공식 기본 봇 셋 (spec `03 § 4.13.1`)
   *
   * **`demo-reset.ts` 가 아니라 이쪽이다.** 데모를 되돌려도 마켓에 늘 있어야 하는 봇이라,
   * 데모가 자기 것만 되돌리는 쪽이 아니라 기본 데이터를 까는 쪽에 둔다. 이 스크립트는
   * 앞에서 전 테이블을 TRUNCATE 하므로 몇 번을 돌려도 같은 세 행이 된다.
   *
   * **소유자를 비운다(`teacherId: null`).** `class_bots.teacher_id` 는 이미 nullable 이라
   * 스키마도 마이그레이션도 늘리지 않고, 「소유자가 없는 봇 = 풀림 공식 봇」을 마켓 API 가
   * `isOfficial` 로 파생해 내보낸다(새 컬럼을 두지 않는 까닭). 덤이 하나 더 있다 —
   * 게시 API 는 `where(id = ? and teacher_id = ?)` 로 소유자를 대조하므로 이 세 행은
   * 어느 교사의 손에도 0행으로 잡힌다. 곧 **아무도 공식 봇을 내리거나 고칠 수 없다.**
   * 되돌리는 스크립트가 따로 없는 대신 시드가 늘 같은 모양을 깔아 준다.
   *
   * 값은 `lib/mock/classbot-official.ts` 의 `ot_001~003` 에서 그대로 가져온다 —
   * 이름·인사말·빠른 질문·한 줄 소개까지 이미 있어서 지어낼 값이 없다. 한 줄 소개
   * (`publish_blurb`)는 그쪽의 `tagline` 이다.
   *
   * **커리큘럼 단원(`bot_curriculum_units`)은 넣지 않는다.** `ot_*` 의 `curriculum` 은
   * `{ title, order }` 뿐인데 그 테이블은 `full_path`(「중2 수학 · 일차함수 · …」 꼴의
   * 전체 경로)를 NOT NULL 로 요구한다 — 없는 값을 지어내야 한다. 게다가 그 테이블을
   * 읽는 코드가 아직 없고(라우트 전수 확인), 런타임에 만들어지는 봇도 단원 없이 선다.
   */
  const officialBotRows = OFFICIAL_BOT_SEEDS.map(({ id, tutorId }, i) => {
    const t = getOfficialTutor(tutorId);
    // mock 에서 봇이 빠지면 조용히 한 줄 덜 깔리는데, 마켓에서 공식 봇이 사라진 것은
    // 시드가 끝난 뒤에 알아채기 어렵다. 그래서 여기서 멈춘다.
    if (!t) {
      throw new Error(
        `[seed] 공식 봇 원본 ${tutorId} 를 lib/mock/classbot-official.ts 에서 찾지 못했습니다.`,
      );
    }
    return {
      id,
      name: t.name,
      // 아바타는 화면이 과목 이니셜로 그리지만 emoji 문자열은 데이터로 남긴다(spec `08 § 14.1.1` 예외 2).
      avatarEmoji: t.avatarEmoji,
      teacherId: null,
      teacherName: t.teacherName, // '풀림 공식'
      organization: t.organization, // '풀림'
      subject: t.subject,
      grade: t.grade,
      tone: t.tone,
      greeting: t.greeting,
      scope: t.scope,
      isLive: false,
      quickPrompts: t.quickPrompts,
      // 참여 인원은 마켓이 참여 행을 실제로 세므로 전시용 숫자를 심지 않는다.
      enrolledCount: 0,
      isPublished: true,
      publishedAt: officialPublishedAt(i),
      publishBlurb: t.tagline,
    };
  });
  await db.insert(classBots).values(officialBotRows);
  console.log(`[seed] class_bots (풀림 공식): ${officialBotRows.length}`);

  /* 6. enrollments — 서연 본인만 enrolled로 (s1 → student_001). 출시 mock 은 빈 배열 → 가드. */
  if (studentEnrollments.length > 0) {
    await db.insert(enrollments).values(
      studentEnrollments.map((e) => ({
        botId: e.botId,
        studentId: currentPersona.id,
        classroomId: e.classroomId,
        classroomLabel: e.classroomLabel,
        assignedBy: e.assignedBy,
        assignedAt: new Date(e.assignedAt),
        via: e.via,
      })),
    );
  }
  console.log(`[seed] enrollments: ${studentEnrollments.length}`);

  /*
    6b. join_codes — 참여 코드(mock CODE_MAP)의 실전판. 학생 join 의 진입점.

    **`expires_at` 을 일부러 비운다(= 안 닫힘).** 발급 경로(`lib/join-code.ts`)는 48시간을
    주지만 이 코드들은 **데모 문**이라 늘 열려 있어야 한다 — prod-verify 가 `MATH-2024` 로
    매일 반에 들어간다(`tests/e2e`). 여기에 수명을 주면 이틀 뒤부터 회귀가 깨진다.
    (같은 이유를 `lib/db/schema.ts` 의 그 컬럼 주석이 ②로 적어 두었다.)
  */
  const codeRows = Object.entries(CODE_MAP).map(([code, t]) => ({
    code,
    botId: t.botId,
    classroomId: t.classroomId,
    teacherId: BOT_TO_TEACHER[t.botId] ?? 'teacher_001', // 복합 FK — 봇·반 소유 교사 (Codex #190)
  }));
  if (codeRows.length > 0) {
    await db.insert(joinCodes).values(codeRows);
  }
  console.log(`[seed] join_codes: ${codeRows.length}`);

  /* 7. bot_curriculum_units */
  const curriculumRows: Array<typeof botCurriculumUnits.$inferInsert> = [];
  for (const [botId, units] of Object.entries(botCurriculum)) {
    for (const u of units) {
      curriculumRows.push({
        id: u.id,
        botId,
        label: u.label,
        fullPath: u.fullPath,
        achievementCodes: u.achievementCodes,
      });
    }
  }
  await db.insert(botCurriculumUnits).values(curriculumRows);
  console.log(`[seed] bot_curriculum_units: ${curriculumRows.length}`);

  /* 8. bot_settings — mock은 cb_001용 1개만 풀반영, 나머지 봇은 빈 객체 */
  await db.insert(botSettings).values(
    mockClassBots.map((b) => ({
      botId: b.id,
      settings: b.id === 'cb_001' ? (mockBotSettings as unknown as Record<string, unknown>) : {},
    })),
  );
  console.log(`[seed] bot_settings: ${mockClassBots.length}`);

  /* 9. lessons — upcomingLessons (교사) */
  if (upcomingLessons.length > 0) {
    await db.insert(lessons).values(
      upcomingLessons.map((l) => ({
        id: l.id,
        botId: 'cb_001', // upcoming은 cb_001만
        classroomId: 'cr_math_a',
        title: l.title,
        chapter: l.chapter,
        startLabel: l.start,
        status: l.status,
        prepReady: l.prepReady,
        studentCount: l.studentCount,
        botName: l.botName,
      })),
    );
  }
  console.log(`[seed] lessons: ${upcomingLessons.length}`);

  /* 10. live_sessions */
  if (mockLiveSessions.length > 0) {
    await db.insert(liveSessions).values(
      mockLiveSessions.map((ls) => {
        const { botId, classroomId } = liveSessionBotAndClassroom(ls);
        return {
          id: ls.id,
          botId,
          classroomId,
          lessonId: null,
          botName: ls.botName,
          botEmoji: ls.botEmoji,
          classroomLabel: ls.classroom,
          subject: ls.subject,
          status: ls.status,
          startLabel: ls.startedAt,
          durationMin: ls.durationMin,
          participantCount: ls.participantCount,
          totalCount: ls.totalCount,
          scope: ls.scope,
          intensity: ls.intensity,
          alertCount: ls.alertCount,
          // 현재 라이브 중인 ls_a 세션에 한해 classRoster 스냅샷
          roster: ls.id === 'ls_a' ? classRoster : [],
        };
      }),
    );
  }
  console.log(`[seed] live_sessions: ${mockLiveSessions.length}`);

  /* 11. live_quizzes — currentQuiz + history + drafts */
  const quizRows: Array<typeof liveQuizzes.$inferInsert> = [
    {
      id: currentQuiz.id,
      liveSessionId: 'ls_a',
      question: currentQuiz.question,
      type: 'mcq',
      options: currentQuiz.options,
      answerIndex: currentQuiz.answerIndex,
      distribution: currentQuiz.distribution,
      responded: currentQuiz.responded,
      total: currentQuiz.total,
      correctRate: 0,
      scope: '일차함수 · 기울기',
      tier: 'T2',
      status: 'live',
      startLabel: '진행 중',
      remainingSec: currentQuiz.remainingSec,
    },
    ...quizHistory.map((q) => ({
      id: q.id,
      liveSessionId: q.status === 'draft' ? null : 'ls_a',
      question: q.question,
      type: q.type,
      options: null,
      answerIndex: null,
      distribution: null,
      responded: q.responded,
      total: q.total,
      correctRate: q.correctRate,
      scope: q.scope,
      tier: q.tier,
      status: q.status,
      startLabel: q.startedAt,
      remainingSec: null,
    })),
    ...quizDrafts.map((d) => ({
      id: d.id,
      liveSessionId: null,
      question: d.topic,
      type: 'mcq' as const,
      options: null,
      answerIndex: null,
      distribution: null,
      responded: 0,
      total: 0,
      correctRate: 0,
      scope: d.reasonChip,
      tier: 'T2' as const,
      status: 'draft' as const,
      startLabel: `${d.difficulty} · ${d.estimateSec}s`,
      remainingSec: d.estimateSec,
    })),
  ];
  await db.insert(liveQuizzes).values(quizRows);
  console.log(`[seed] live_quizzes: ${quizRows.length}`);

  /* 12. bot_questions */
  if (liveFeed.length > 0) {
    await db.insert(botQuestions).values(
      liveFeed.map((f) => ({
        id: f.id,
        liveSessionId: 'ls_a',
        studentId: mapStudentId(f.studentId),
        studentName: f.studentName,
        question: f.question,
        scopeUsed: f.scopeUsed,
        shared: f.shared,
        botAnswerPreview: f.botAnswerPreview,
        tier: f.tier,
        agoMin: f.agoMin,
      })),
    );
  }
  console.log(`[seed] bot_questions: ${liveFeed.length}`);

  /* 13. replays */
  const knownLessonIds = new Set(upcomingLessons.map((l) => l.id));
  if (studentReplays.length > 0) {
    await db.insert(replays).values(
      studentReplays.map((r) => ({
        id: r.id,
        lessonId: knownLessonIds.has(r.lessonId) ? r.lessonId : null,
        botId: r.botId,
        classroom: r.classroom,
        title: r.title,
        chapter: r.chapter,
        botName: r.botName,
        date: r.date,
        startedAtLabel: r.startedAt,
        endedAtLabel: r.endedAt,
        durationMin: r.durationMin,
        participantCount: r.participantCount,
        status: r.status,
        aiProcessedAtLabel: r.aiProcessedAt,
        sentAtLabel: r.sentAt,
        myAccuracy: r.myAccuracy,
        keyTakeaways: r.keyTakeaways,
        segments: r.segments,
        transcript: r.transcript,
        focusBins: r.focusBins,
        viewerStats: r.viewerStats,
      })),
    );
  }
  console.log(`[seed] replays: ${studentReplays.length}`);

  /* 14. replay_bookmarks · teacher_questions · watch_progress */
  const bookmarkRows: Array<typeof replayBookmarks.$inferInsert> = [];
  const teacherQRows: Array<typeof replayTeacherQuestions.$inferInsert> = [];
  const watchRows: Array<typeof replayWatchProgress.$inferInsert> = [];

  for (const r of studentReplays) {
    for (const bm of r.bookmarks) {
      bookmarkRows.push({
        id: `${r.id}_${bm.id}`,
        replayId: r.id,
        studentId: currentPersona.id,
        atSec: bm.atSec,
        label: bm.label,
        createdAtLabel: bm.createdAt,
      });
    }
    for (const tq of r.teacherQuestions) {
      teacherQRows.push({
        id: `${r.id}_${tq.id}`,
        replayId: r.id,
        studentId: currentPersona.id,
        atSec: tq.atSec,
        text: tq.text,
        status: tq.status,
        reply: tq.reply ?? null,
      });
    }
    watchRows.push({
      replayId: r.id,
      studentId: currentPersona.id,
      lastSec: r.watchProgress.lastSec,
      completed: r.watchProgress.completed,
    });
  }
  if (bookmarkRows.length) await db.insert(replayBookmarks).values(bookmarkRows);
  if (teacherQRows.length) await db.insert(replayTeacherQuestions).values(teacherQRows);
  if (watchRows.length) await db.insert(replayWatchProgress).values(watchRows);
  console.log(
    `[seed] replay_bookmarks: ${bookmarkRows.length}, teacher_questions: ${teacherQRows.length}, watch_progress: ${watchRows.length}`,
  );

  /* 15. assignments + assignment_questions */
  if (studentAssignments.length > 0) {
    await db.insert(assignments).values(
      studentAssignments.map((a) => ({
        id: a.id,
        botId: a.botId,
        studentId: currentPersona.id,
        title: a.title,
        scope: a.scope,
        subject: a.subject,
        grade: a.grade,
        chapterFrom: a.chapterFrom,
        chapterTo: a.chapterTo,
        achievementCodes: a.achievementCodes,
        questionCount: a.questionCount,
        difficulty: a.difficulty,
        mode: a.mode,
        scopeOverride: a.scopeOverride ?? null,
        source: a.source,
        assignedBy: a.assignedBy,
        assignedAtLabel: a.assignedAt,
        dueLabel: a.dueLabel,
        dDay: a.dDay,
        completedCount: a.completedCount,
        recentAccuracy: a.recentAccuracy ?? null,
        state: a.state,
        reasonHint: a.reasonHint ?? null,
        solveHref: a.solveHref,
      })),
    );
  }
  // 문항 풀(as_today 등)은 부모 과제가 없는 데모 콘텐츠 — FK 정합 위해 부모가 시드된 것만.
  // 문항 콘텐츠의 DB 영속은 M3(QGen 생성 경로)에서 — 그 전까지 FE 가 mock 풀에서 해석(현행 유지).
  const seededAssignmentIds = new Set(studentAssignments.map((a) => a.id));
  const validQuestionRows = mockAssignmentQuestions.filter((q) => seededAssignmentIds.has(q.assignmentId));
  if (validQuestionRows.length > 0) {
    await db.insert(assignmentQuestions).values(
      validQuestionRows.map((q) => ({
        id: q.id,
        assignmentId: q.assignmentId,
        order: q.order,
        type: q.type,
        prompt: q.prompt,
        options: q.options ?? null,
        answerIndex: q.answerIndex ?? null,
        answerKey: q.answerKey ?? null,
        modelAnswer: q.modelAnswer ?? null,
        hints: q.hints ?? null,
      })),
    );
  }
  console.log(
    `[seed] assignments: ${studentAssignments.length}, assignment_questions: ${validQuestionRows.length}`,
  );

  /* 16. grading_items (+ overriddenSample) — `grading_history` 는 표가 걷혔다(계획 PR 8) */
  await db.insert(gradingItems).values(
    [...gradingQueue, overriddenSample].map((g) => ({
      id: g.id,
      studentId: mapStudentId(g.studentId),
      studentName: g.studentName,
      assignmentTitle: g.assignmentTitle,
      submittedAtLabel: g.submittedAt,
      type: g.type,
      topic: g.topic,
      draftScore: g.draftScore,
      maxScore: g.maxScore,
      tier: g.tier,
      aiConfidence: g.aiConfidence,
      responsePreview: g.responsePreview,
      draftComment: g.draftComment,
      rubric: g.rubric as unknown as Array<Record<string, unknown>>,
      status: g.status,
      overrideDelta: g.overrideDelta ?? null,
    })),
  );

  console.log(`[seed] grading_items: ${gradingQueue.length + 1}`);

  /*
   * 17·18 이 있던 자리 — `emotion_checkins` · `wellbeing_snapshots` 는 표가 걷혔다(계획 PR 8).
   * 그 둘을 읽던 `GET /api/wellness` 가 함께 걷혔고, 웰빙 화면은 `lib/mock` 을 직접 읽으므로
   * 시드가 채워 줄 곳이 없다. 목 배열(`emotionCheckIns` · `wellbeingSnapshots`)은 그대로 산다.
   */

  /* 19. crisis_alerts */
  if (mockCrisisAlerts.length > 0) {
    await db.insert(crisisAlerts).values(
      mockCrisisAlerts.map((a) => ({
        id: a.id,
        studentId: mapStudentId(a.studentId),
        triggerType: a.triggerType,
        severity: a.severity,
        detectedAtLabel: a.detectedAt,
        summary: a.summary,
        notifiedTeacher: a.notifiedTeacher,
        notifiedParent: a.notifiedParent,
        notifiedWeeCenter: a.notifiedWeeCenter,
        resolved: a.resolved,
      })),
    );
  }
  console.log(`[seed] crisis_alerts: ${mockCrisisAlerts.length}`);

  /* 20. reports */
  if (mockReports.length > 0) {
    await db.insert(reports).values(
      mockReports.map((r) => ({
        id: r.id,
        kind: r.kind,
        title: r.title,
        subject: r.subject,
        generatedAtLabel: r.generatedAt,
        status: r.status,
        kpis: r.kpis as unknown as Array<Record<string, unknown>>,
        summary: r.summary,
        alerts: r.alerts ?? [],
      })),
    );
  }
  console.log(`[seed] reports: ${mockReports.length}`);

  /* 21. templates + my uploads */
  // myTemplateUploads 중 tpl_001과 같은 id가 마켓에 있어 마켓 row를 published로 두고,
  // review/draft인 mt2, mt3는 별도 row로 추가.
  const myUploadIds = new Set(myTemplateUploads.map((m) => m.title));
  const baseRows = mockTemplates.map((t) => {
    const myMatch = myTemplateUploads.find((m) => m.title === t.title);
    return {
      id: t.id,
      kind: t.kind,
      title: t.title,
      authorName: t.authorName,
      authorOrganization: t.authorOrganization,
      isOfficial: t.isOfficial ?? false,
      pricing: t.pricing as 'free' | { krw: number },
      subject: t.subject,
      grade: t.grade,
      downloads: myMatch?.downloads ?? t.downloads,
      rating: t.rating,
      ratingCount: t.ratingCount,
      description: t.description,
      highlights: t.highlights,
      updatedAtLabel: t.updatedAt,
      publishStatus: 'published' as const,
      earnings: myMatch?.earnings ?? null,
    };
  });
  const extraMyRows = myTemplateUploads
    .filter((m) => !mockTemplates.some((t) => t.title === m.title))
    .map((m, i) => ({
      id: m.id,
      kind: m.kind,
      title: m.title,
      authorName: TEACHER_NAMES.teacher_001,
      authorOrganization: DEMO_TEACHER_PROFILE.organization,
      isOfficial: false,
      pricing: 'free' as const,
      subject: '수학',
      grade: '중2',
      downloads: m.downloads,
      rating: 0,
      ratingCount: 0,
      description: '내가 업로드한 템플릿 — 검수/초안 상태',
      highlights: [] as string[],
      updatedAtLabel: '대기',
      publishStatus: m.status,
      earnings: m.earnings ?? null,
    }));
  await db.insert(templates).values([...baseRows, ...extraMyRows]);
  console.log(`[seed] templates: ${baseRows.length + extraMyRows.length}`);

  /*
   * 22 가 있던 자리 — `chat_messages` 는 표가 걷혔다(계획 PR 8). 시드가 채운 적은 없고
   * (「Ph1 에서는 비어 있음」), 대화 정본은 pullim-api 다.
   */

  // unused but imported — quiet linter for unused vars
  void myUploadIds;

  console.log('[seed] done ✅');
}

main()
  .catch((err) => {
    console.error('[seed] FAILED:', err);
    process.exit(1);
  })
  .finally(async () => {
    await getPool().end();
  });
