/**
 * 학생 읽기 4면 API 응답 행 타입 — Phase 7 Stage 2.
 *
 * Stage 1(#92) 라우트 핸들러가 Drizzle 컬럼을 그대로 select 해 반환하므로,
 * 행 형태는 `lib/db/schema.ts` 의 컬럼과 1:1 이다(타임스탬프는 JSON 직렬화로 string).
 * mock 타입(`lib/mock`)과 컬럼명은 대체로 일치하나, mock 의 파생 필드
 * (`daysAgo` 등)는 API 에 없다 — 그런 파생은 소비부에서 date 로 계산한다.
 */

/** `GET /api/bots` — enrollments ⋈ class_bots 한 행(봇 카드 + 반 메타). */
export interface BotReadRow {
  id: string;
  name: string;
  avatarEmoji: string;
  teacherName: string;
  organization: string;
  subject: string;
  grade: string;
  tone: '정중' | '친근' | '스파르타' | '차분' | '열정';
  greeting: string;
  scope: number;
  isLive: boolean;
  currentLesson: Record<string, unknown> | null;
  quickPrompts: Array<{ text: string; expectedReplyKey: string }>;
  enrolledCount: number;
  classroomId: string;
  classroomLabel: string;
  assignedBy: string;
  via: string;
}

/** `GET /api/assignments` — 내게 배정된 과제 한 행. */
export interface AssignmentReadRow {
  id: string;
  botId: string;
  studentId: string | null;
  title: string;
  scope: string;
  subject: string;
  grade: string;
  chapterFrom: string;
  chapterTo: string;
  achievementCodes: string[];
  questionCount: number;
  difficulty: '하' | '중' | '상';
  mode: 'practice' | 'exam' | 'wrong-conquest';
  scopeOverride: number | null;
  source: 'teacher-assigned' | 'bot-prescribed' | 'self';
  assignedBy: string;
  assignedAtLabel: string;
  dueLabel: string;
  dDay: string;
  completedCount: number;
  recentAccuracy: number | null;
  state: 'todo' | 'in-progress' | 'submitted' | 'overdue';
  reasonHint: string | null;
  solveHref: string;
}

/** `GET /api/grades` — 내 채점 이력 한 행. */
export interface GradeReadRow {
  id: number;
  studentId: string;
  assignmentTitle: string;
  gradedAtLabel: string;
  score: number;
  maxScore: number;
}

/** `GET /api/wellness` 의 감정 체크인 한 행. */
export interface EmotionCheckInReadRow {
  id: string;
  studentId: string;
  /** ISO yyyy-mm-dd */
  date: string;
  mood: number;
  intensity: number | null;
  intensityRange: [number, number] | null;
  freeText: string | null;
  keywordFlag: 'suicidal' | 'depression' | 'bullying' | null;
}

/** `GET /api/wellness` 의 웰빙 스냅샷 한 행. */
export interface WellbeingSnapshotReadRow {
  studentId: string;
  /** ISO yyyy-mm-dd */
  date: string;
  score: number;
  flag: 'below-60-3days' | 'below-40-instant' | null;
}

/** `GET /api/bots` 응답 봉투. */
export interface BotsReadResponse {
  bots: BotReadRow[];
}

/** `GET /api/assignments` 응답 봉투. */
export interface AssignmentsReadResponse {
  assignments: AssignmentReadRow[];
}

/** `GET /api/grades` 응답 봉투. */
export interface GradesReadResponse {
  grades: GradeReadRow[];
}

/** `GET /api/wellness` 응답 봉투. */
export interface WellnessReadResponse {
  snapshots: WellbeingSnapshotReadRow[];
  checkIns: EmotionCheckInReadRow[];
}
