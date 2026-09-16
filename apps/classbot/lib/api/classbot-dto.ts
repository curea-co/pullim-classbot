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

/**
 * `JoinCodeResponseDto` — `POST /classbot/classes/:classId/join-codes`(201 · operator 만 · 남의 반 403).
 *
 * 정본 응답은 넷(`id`·`code`·`classId`·`createdAt`)이다. `expiresAt` 은 **아직 서버가 보내지 않는다** —
 * 「`expires_at` 채우기 + 재발급 시 옛 코드 삭제」는 완성 설계 § 5 R1 이 pullim-api PR 2 에 맡긴 일이다.
 * 여기 선택 칸으로 미리 적어 두는 이유는 화면(`join-code-block.tsx`)이 값이 오면 남은 시간을 그리고,
 * 없으면 아무 말도 안 하게 **한 분기**로 서 있게 하려는 것이다 — 그 문이 열리는 날 이 파일만 `string` 으로 좁힌다.
 */
export interface JoinCodeDto {
  id: string;
  /** 하이픈 없는 코드(예: `AB3K9M`). 표기는 `lib/join-code-format.ts` 가 한다. */
  code: string;
  /** 대상 반(=bot) id. */
  classId: string;
  /** ISO 8601. */
  createdAt: string;
  /** ISO 8601 · 서버가 아직 보내지 않는다(pullim-api PR 2). */
  expiresAt?: string | null;
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

/* ─── 과제 쓰기·제출 — 2026-09-16 계획 §05 R6·R9·R10 (FE PR 6) ─── */

/**
 * `DispatchAssignmentQuestionDto` — `POST /classbot/classes/:classId/assignments` 본문의 문항 한 개.
 *
 * 서버 검증(`assignment.service.ts` `assertAnswerKeyValid`)이 정한 모양:
 *  - `mc`: `options` 비어 있지 않은 배열 + `answerKey` 는 `[0, options.length)` 정수 인덱스
 *  - `numeric`: `answerKey` 는 유한한 **number**(문자열이면 400)
 *  - `short`: `answerKey` 는 공백 아닌 문자열
 *  - `essay`: `answerKey` 없음(서버가 `autoGradable=false` 로 도출)
 * `autoGradable` 은 보내지 않는다 — 서버가 `type` 으로 도출한다. **배점·루브릭·힌트를 실을 칸은 없다.**
 */
export interface DispatchAssignmentQuestionBody {
  /** 0 이상 정수. 이 앱은 0부터 순서대로 보낸다. */
  order: number;
  type: 'mc' | 'short' | 'essay' | 'numeric';
  prompt: string;
  /** 객관식 보기(문자열 배열) · 그 외 생략. */
  options?: string[];
  /** 🔒 정답키 — mc 인덱스(number) · numeric(number) · short(string). essay 는 생략. */
  answerKey?: number | string;
}

/**
 * `DispatchAssignmentDto` — 과제 내기 본문. `questionCount` 는 서버가 `questions.length` 로 덮어 쓴다.
 * `targetStudentIds` 를 비우거나 빼면 **반 전체**다. `dispatchStatus`·`createdBy`·`dispatchedAt` 은 서버가 정한다.
 * 마감 **시각**(`dueAt`)·봇 한 마디(`reasonHint`)·`scopeOverride` 는 정본에 칸이 없다.
 */
export interface DispatchAssignmentBody {
  title: string;
  scope: string;
  subject: string;
  grade: string;
  mode: 'practice' | 'exam' | 'wrong-conquest';
  questionCount: number;
  difficulty: string;
  dueLabel: string;
  /** 정수 D-day — 서버는 이 값을 그대로 저장한다(다시 세지 않는다). */
  dDay: number;
  state: string;
  chapterFrom?: string | null;
  chapterTo?: string | null;
  achievementCodes?: string[] | null;
  examTimeLimitMin?: number | null;
  targetStudentIds?: string[];
  /** 최소 1개. */
  questions: DispatchAssignmentQuestionBody[];
}

/** `SubmitAssignmentDto` — `POST /classbot/assignments/:id/submit`. 점수는 받지 않는다(서버가 센다). */
export interface SubmitAssignmentBody {
  /** 문항 id → 답(mc 는 선택 인덱스, short/numeric 은 값). */
  answers: Record<string, unknown>;
}

/**
 * `SubmissionResponseDto` — 제출 응답(본인 관점). 최초 201 · 재제출 200, 본문 같음.
 * `scorePercent` 는 서버 권위값 — 서술형이 하나라도 있으면 null(미채점). **문항별 정오는 오지 않는다.**
 */
export interface SubmissionDto {
  submissionId: string;
  assignmentId: string;
  studentId: string;
  scorePercent: number | null;
  /** ISO 8601 · 미채점 null. */
  gradedAt: string | null;
  /** ISO 8601. */
  submittedAt: string;
}

/** `SubmissionsViewResponseDto` — `GET /classbot/assignments/:id/submissions`(operator) 한 행. 답안이 함께 온다. */
export interface SubmissionsViewDto {
  submissionId: string;
  /** 제출 학생 sub — 표시명은 없다(반 명단 조인은 pullim-api PR 2 `members`). */
  studentId: string;
  scorePercent: number | null;
  gradedAt: string | null;
  submittedAt: string;
  answers: Record<string, unknown>;
}
