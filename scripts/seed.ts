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

import { db, getPool } from '../src/lib/db';
import {
  assignmentQuestions,
  assignments,
  botCurriculumUnits,
  botQuestions,
  botSettings,
  chatMessages,
  classBots,
  classrooms,
  consentLogs,
  crisisAlerts,
  emotionCheckIns,
  enrollments,
  gradingHistory,
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
  wellbeingSnapshots,
} from '../src/lib/db/schema';

import { currentPersona } from '../src/lib/mock/persona';
import { childLinks, consentLog, currentParent } from '../src/lib/mock/family';
import {
  botCurriculum,
  botSettings as mockBotSettings,
  classBots as mockClassBots,
  classRoster,
  crisisAlerts as mockCrisisAlerts,
  currentTeacher,
  emotionCheckIns as mockEmotionCheckIns,
  gradingHistory as mockGradingHistory,
  gradingQueue,
  liveFeed,
  liveSessions as mockLiveSessions,
  myTemplateUploads,
  overriddenSample,
  pendingItems as _pendingItems,
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
  wellbeingSnapshots as mockWellbeingSnapshots,
  type ClassroomStudent,
} from '../src/lib/mock/classbot';

const ALL_TABLES = [
  // 부모 순서로 — TRUNCATE RESTART IDENTITY CASCADE는 의존관계 자동 처리하지만 순서 명시로 가독성 확보
  'chat_messages',
  'grading_history',
  'grading_items',
  'crisis_alerts',
  'wellbeing_snapshots',
  'emotion_checkins',
  'reports',
  'templates',
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
  cb_001: 'teacher_001', // 김수학
  cb_002: 'teacher_002', // 박영어
  cb_003: 'teacher_003', // 정과학
  cb_004: 'teacher_004', // 최국어
  cb_005: 'teacher_005', // 강사회
};

const TEACHER_NAMES: Record<string, string> = {
  teacher_001: '김수학',
  teacher_002: '박영어',
  teacher_003: '정과학',
  teacher_004: '최국어',
  teacher_005: '강사회',
};

/** lessonId 라벨을 봇 id에 묶기 */
function lessonOwnerBot(lessonId: string): string {
  if (lessonId.startsWith('les_eng')) return 'cb_002';
  return 'cb_001';
}

/** liveSession.id → bot/classroom 매핑 */
function liveSessionBotAndClassroom(ls: { botName: string; classroom: string }) {
  const botEntry = mockClassBots.find((b) => b.name === ls.botName);
  const botId = botEntry?.id ?? 'cb_001';
  // 봇 첫 enrollment의 classroom id로 매핑
  const enrollment = studentEnrollments.find((e) => e.botId === botId);
  const classroomId = enrollment?.classroomId ?? 'cr_math_a';
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
    profile: id === 'teacher_001'
      ? {
          title: currentTeacher.title,
          organization: currentTeacher.organization,
          yearsOfExperience: currentTeacher.yearsOfExperience,
          activeBots: currentTeacher.activeBots,
          totalStudents: currentTeacher.totalStudents,
        }
      : {},
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

  /* 4. classrooms */
  const classroomMap = new Map<string, { label: string; org: string; teacherId: string }>();
  for (const e of studentEnrollments) {
    if (!classroomMap.has(e.classroomId)) {
      classroomMap.set(e.classroomId, {
        label: e.classroomLabel,
        org: e.via,
        teacherId: BOT_TO_TEACHER[e.botId] ?? 'teacher_001',
      });
    }
  }
  await db.insert(classrooms).values(
    Array.from(classroomMap.entries()).map(([id, v]) => ({
      id,
      label: v.label,
      organization: v.org,
      teacherId: v.teacherId,
    })),
  );
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

  /* 6. enrollments — 서연 본인만 enrolled로 (s1 → student_001) */
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
  console.log(`[seed] enrollments: ${studentEnrollments.length}`);

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
  console.log(`[seed] lessons: ${upcomingLessons.length}`);

  /* 10. live_sessions */
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
      scope: '미적분 III · 극값',
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
  console.log(`[seed] bot_questions: ${liveFeed.length}`);

  /* 13. replays */
  const knownLessonIds = new Set(upcomingLessons.map((l) => l.id));
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
  await db.insert(assignmentQuestions).values(
    mockAssignmentQuestions.map((q) => ({
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
  console.log(
    `[seed] assignments: ${studentAssignments.length}, assignment_questions: ${mockAssignmentQuestions.length}`,
  );

  /* 16. grading_items (+ overriddenSample) + grading_history */
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

  await db.insert(gradingHistory).values(
    mockGradingHistory.map((h) => ({
      studentId: mapStudentId(h.studentId),
      assignmentTitle: h.assignmentTitle,
      gradedAtLabel: h.gradedAt,
      score: h.score,
      maxScore: h.maxScore,
    })),
  );
  console.log(
    `[seed] grading_items: ${gradingQueue.length + 1}, grading_history: ${mockGradingHistory.length}`,
  );

  /* 17. emotion_checkins */
  await db.insert(emotionCheckIns).values(
    mockEmotionCheckIns.map((e) => ({
      id: e.id,
      studentId: mapStudentId(e.studentId),
      date: e.date,
      mood: e.mood,
      intensity: e.intensity ?? null,
      intensityRange: e.intensityRange ?? null,
      freeText: e.freeText ?? null,
      keywordFlag: e.keywordFlag ?? null,
    })),
  );
  console.log(`[seed] emotion_checkins: ${mockEmotionCheckIns.length}`);

  /* 18. wellbeing_snapshots — date 컬럼이 PK라 daysAgo→date 변환. mock 기준일 today */
  const today = new Date('2026-05-11'); // mock의 daysAgo=0 기준일 (emotionCheckIns date='2026-05-11')
  const wellbeingRows = mockWellbeingSnapshots.map((w) => {
    const d = new Date(today);
    d.setDate(d.getDate() - w.daysAgo);
    return {
      studentId: mapStudentId(w.studentId),
      date: d.toISOString().slice(0, 10),
      score: w.score,
      flag: w.flag ?? null,
    };
  });

  // 같은 (studentId, date) 중복 제거 — wellbeing은 일자별 1개만
  const wellbeingDedup = new Map<string, typeof wellbeingRows[number]>();
  for (const r of wellbeingRows) {
    wellbeingDedup.set(`${r.studentId}|${r.date}`, r);
  }
  await db.insert(wellbeingSnapshots).values(Array.from(wellbeingDedup.values()));
  console.log(`[seed] wellbeing_snapshots: ${wellbeingDedup.size}`);

  /* 19. crisis_alerts */
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
  console.log(`[seed] crisis_alerts: ${mockCrisisAlerts.length}`);

  /* 20. reports */
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
      authorName: currentTeacher.name,
      authorOrganization: currentTeacher.organization,
      isOfficial: false,
      pricing: 'free' as const,
      subject: '수학Ⅱ',
      grade: '고2',
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

  /* 22. chat_messages — 1차에서는 비워둠 (런타임 영속화 시작 전) */
  void chatMessages; // 명시적 미사용 표시
  console.log('[seed] chat_messages: 0 (Ph1에서는 비어 있음)');

  // unused but imported — quiet linter for unused vars
  void _pendingItems;
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
