/**
 * pullim-api classbot 응답 DTO — FE 쪽 거울.
 *
 * 정본은 pullim-api `src/classbot/modules/{assignment,classroom}/controller/dto/*.ts` 와
 * `service/{assignment,classroom}.types.ts` 다(2026-09-16 · dev). 필드를 하나씩 옮겨 적었고,
 * 서버가 `string` 으로 열어 둔 칸(mode·difficulty·state·tone·dispatchStatus)은 여기서도 string 이다 —
 * 화면 union 으로 좁히는 일은 어댑터(`app/(student)/classbot/assignment/use-assignment-reads.ts` 의
 * `toAssignmentReadRow`, `components/classbot/home/my-rooms.ts` 의 `toSlot`)가 한다.
 *
 * 목록 응답은 **봉투 없는 배열**이다 — `GET /classbot/assignments` 는 `AssignmentSummaryDto[]`,
 * `GET /classbot/bots` 는 `BotCardDto[]`. 같은 오리진 `/api/*` 의 `{ assignments: [...] }` 봉투와 다르다.
 *
 * bot == class(ADR-063): 카드·상세의 `id` 와 참여 응답의 `classId` 는 같은 행이다. 봇을 반에서
 * 떼는 `bots` 표(계획 §05 · pullim-api PR 1)가 오면 이 파일의 `BotCardDto` 가 먼저 갈린다.
 */

/** `AssignmentSummaryResponseDto` — 목록 한 행·배포 201 응답. 문항·answerKey 없음. */
export interface AssignmentSummaryDto {
  id: string;
  /** 소속 반 id — bot == class 라 화면의 botId 로 쓴다. */
  classId: string;
  title: string;
  scope: string;
  subject: string;
  grade: string;
  /** 서버는 string — 화면 union(practice·exam·wrong-conquest)으로는 어댑터가 좁힌다. */
  mode: string;
  questionCount: number;
  /** 서버는 string — 화면 union(하·중·상)으로는 어댑터가 좁힌다. */
  difficulty: string;
  dueLabel: string;
  /** 정수 D-day. 화면 라벨("D-3"·"오늘")은 어댑터가 만든다. */
  dDay: number;
  dispatchStatus: string;
  /** ISO 8601 · 미배포 null. */
  dispatchedAt: string | null;
  examTimeLimitMin: number | null;
  /** 교사가 낼 때 보낸 값이 그대로 돌아온다(서버는 검증만, 해석 안 함). */
  state: string;
  chapterFrom: string | null;
  chapterTo: string | null;
  achievementCodes: string[] | null;
}

/** `AssignmentQuestionResponseDto` — 🔒 `answerKey` 없음(서버 전용 채점 소스). */
export interface AssignmentQuestionDto {
  id: string;
  order: number;
  type: string;
  prompt: string;
  /** 객관식 선택지 blob · 그 외 null. */
  options: unknown[] | null;
  autoGradable: boolean;
}

/** `AssignmentDetailResponseDto` — 요약 + 문항. `GET /classbot/assignments/:id`. */
export interface AssignmentDetailDto extends AssignmentSummaryDto {
  questions: AssignmentQuestionDto[];
}

/** `BotProfileView` — `class_bot_profiles` 1:1. 카드·상세의 `profile` 칸(생성 전 null). */
export interface BotProfileDto {
  subject: string;
  grade: string;
  /** 서버는 string — 화면 union(정중·친근·스파르타·차분·열정)으로는 어댑터가 좁힌다. */
  tone: string;
  greeting: string;
  scope: number;
  avatarEmoji: string;
  /** 서버는 문장만 준다 — 화면의 `ClassbotQuickPrompt`(text + expectedReplyKey)와 모양이 다르다. */
  quickPrompts: string[];
  enrolledCount: number;
  isLive: boolean;
  currentLesson: Record<string, unknown> | null;
}

/** `BotCardResponseDto` — `GET /classbot/bots?role=` 한 행. */
export interface BotCardDto {
  /** bot(=class) id. */
  id: string;
  /** 반 이름. */
  name: string;
  description: string | null;
  isActive: boolean;
  /** 요청자 관점 — operator 면 teacher, member 면 student. */
  role: 'teacher' | 'student';
  profile: BotProfileDto | null;
}

/** `BotDetailResponseDto` — `GET /classbot/bots/:id`. 커리큘럼·설정 칸은 이 앱이 아직 읽지 않아 적지 않았다. */
export interface BotDetailDto {
  id: string;
  name: string;
  description: string | null;
  isActive: boolean;
  /** 운영자(교사) sub — 표시명은 없다(계획 §10 해소 5 · pullim-api PR 2 members 조인). */
  operatorId: string;
  profile: BotProfileDto | null;
}

/** `EnrollmentResponseDto` — `POST /classbot/enrollments`. 신규 201 · 이미 멤버 200, 본문은 같다. */
export interface EnrollmentDto {
  membershipId: string;
  /** 들어간 반(=bot) id. */
  classId: string;
  /** 수강 학생 sub. */
  memberId: string;
  /** ISO 8601. */
  enrolledAt: string;
}
