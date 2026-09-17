/**
 * pullim-api classbot 응답 DTO — FE 쪽 거울.
 *
 * 정본은 pullim-api `src/classbot/modules/{assignment,classroom,chat,signal}/controller/dto/*.ts` 와
 * `service/*.types.ts` 다(2026-09-17 · dev `324f36fc`). 필드를 하나씩 옮겨 적었고,
 * 서버가 `string` 으로 열어 둔 칸(mode·difficulty·state·tone·dispatchStatus)은 여기서도 string 이다 —
 * 화면 union 으로 좁히는 일은 어댑터(`app/(student)/classbot/assignment/use-assignment-reads.ts` 의
 * `toAssignmentReadRow`, `components/classbot/home/my-rooms.ts` 의 `toSlot`)가 한다.
 *
 * 목록 응답은 **봉투 없는 배열**이다 — `GET /classbot/assignments` 는 `AssignmentSummaryDto[]`,
 * `GET /classbot/bots` 는 `BotCardDto[]`. 같은 오리진 `/api/*` 의 `{ assignments: [...] }` 봉투와 다르다.
 *
 * **봇은 이제 두 뜻이다(ADR-092 · pullim-api PR 1·2, 2026-09-17 `origin/dev`)** — 이 파일이 둘을 갈라 적는다.
 *  - `GET /classbot/bots?role=`·`GET /classbot/bots/:id` 는 **아직 bot == class(ADR-063)** 다 — `id` 가 반 id 고
 *    `profile` 은 옛 `class_bot_profiles` 다(api.md § 3.5 「뜻 개정은 후속 PR」). `BotCardDto`·`BotDetailDto` 가 그것.
 *  - `POST/PATCH /classbot/bots`·`PUT /classbot/classes/:classId/bot` 은 **1급 `bots` 표**를 만지고 `BotDto` 로
 *    답한다. 반이 어느 봇을 가리키는지(`classes.bot_id`)는 `ClassDto.bot` 으로만 온다 — 그 `ClassDto` 를 주는 문은
 *    반 생성(`POST /classes`)과 봇 할당(`PUT …/bot`) 둘뿐이고 **읽기 문(`GET /classes/:id`)은 아직 없다**
 *    (api.md § 1 「후속 구현」). 화면이 「지금 붙은 봇」을 어떻게 다루는지는 `hooks/api/classroom.ts`
 *    `useKnownClassSummary` 머리주석.
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
 * `JoinCodeResponseDto` — `POST /classbot/classes/:classId/join-codes`(201 · operator 만 · 남의 반 403) ·
 * `ClassDto.joinCode` · 반 생성 동반 발급.
 *
 * `expiresAt` 은 pullim-api PR 2(ADR-092)부터 **항상 실린다** — 기본 발급 +48h, `null` 이면 안 닫히는 코드
 * (`expiresInHours: null` 로 낸 것). 재발급은 **갈아 끼우기**다 — 그 반의 옛 코드를 전부 지우고 새 코드 하나
 * (api.md § 3.5 「재발급 = 갈아 끼우기」). 학생이 닫힌 코드를 넣으면 `POST /enrollments` 가 410 으로 가른다.
 */
export interface JoinCodeDto {
  id: string;
  /** 하이픈 없는 코드(예: `AB3K9M`). 표기는 `lib/join-code-format.ts` 가 한다. */
  code: string;
  /** 대상 반 id. */
  classId: string;
  /** ISO 8601. */
  createdAt: string;
  /** ISO 8601 닫히는 시각 · `null` = 안 닫힘. */
  expiresAt: string | null;
}

/** `IssueJoinCodeDto` — 재발급 본문. 둘 다 선택: 비우면 서버가 코드를 짓고 48시간 뒤 닫는다. */
export interface IssueJoinCodeBody {
  code?: string;
  /** 1~8760(시) · `null` = 안 닫힘 · 미지정 = 48. */
  expiresInHours?: number | null;
}

/* ─── 반 척추 — ADR-092 · pullim-api PR 2 (계획 PR 5b) ─── */

/** `ClassBotSummaryDto` — `ClassDto.bot`. `classes.bot_id` 로 합성한 요약 셋. */
export interface ClassBotSummaryDto {
  id: string;
  name: string;
  avatarEmoji: string | null;
}

/**
 * `ClassResponseDto` — 반 한 행 + 합성 `bot`(없으면 null — 봇 없는 반도 유효) + 활성 `joinCode`(미만료 최신 코드,
 * 없으면 null). `POST /classbot/classes` 의 `class` 칸과 `PUT /classbot/classes/:classId/bot` 응답.
 * **읽기 문은 아직 없다** — `GET /classbot/classes/:id` 는 api.md § 1 「후속 구현」.
 */
export interface ClassDto {
  id: string;
  /** 운영 교사 sub. */
  operatorId: string;
  orgId: string | null;
  name: string;
  description: string | null;
  subject: string | null;
  grade: string | null;
  isActive: boolean;
  bot: ClassBotSummaryDto | null;
  joinCode: JoinCodeDto | null;
  /** ISO 8601. */
  createdAt: string;
  /** ISO 8601. */
  updatedAt: string;
}

/**
 * `CreateClassDto` — `POST /classbot/classes` 본문. `name` 만 필수(≤100자). `subject`·`grade` ≤50자.
 * `botId` 는 **이미 있는 내 봇을 붙이는 것**이지 여기서 봇을 만들지 않는다(남의 봇·없는 봇 404). `orgId` 는 받지 않는다.
 */
export interface CreateClassBody {
  name: string;
  description?: string | null;
  subject?: string | null;
  grade?: string | null;
  botId?: string | null;
}

/** `CreateClassResponseDto` — 201. 반과 같은 트랜잭션에서 발급된 첫 코드(`expiresAt` 기본 +48h). */
export interface CreateClassResponse {
  class: ClassDto;
  joinCode: JoinCodeDto;
}

/* 명단 한 줄(`ClassMemberDto` · `GET /classes/:classId/members`)은 아래 「명단 · 교사 대화 열람 · 위험 신호」 절 — 명단 탭(5b)과
   대화 탭·관제소(PR 7)가 같은 행을 읽는다(`useClassMembers`). */

/** `AssignClassBotDto` — `PUT /classbot/classes/:classId/bot`. 칸은 필수 — `null` 이 「떼기」다(누락 = 400). */
export interface AssignClassBotBody {
  botId: string | null;
}

/**
 * `BotResponseDto` — 1급 `bots` 행 + 이 봇을 쓰는 반 id 목록. `POST /classbot/bots`(201)·`PATCH /classbot/bots/:id`(200).
 * `scope` 는 ScopeLevel 1~5(서버 기본 3) — 다섯으로 좁히는 일은 읽는 쪽(`lib/mock/tutor.ts` 규칙과 같다).
 */
export interface BotDto {
  id: string;
  /** 봇 owner 교사 sub. */
  operatorId: string;
  name: string;
  subject: string | null;
  grade: string | null;
  tone: string | null;
  greeting: string | null;
  scope: number;
  avatarEmoji: string | null;
  quickPrompts: string[];
  /** 마켓 공개 — 후속 표면. 이 앱은 아직 읽지 않는다. */
  isPublished: boolean;
  publishedAt: string | null;
  /** `classes.bot_id == id` 인 반 id 목록. */
  classIds: string[];
  createdAt: string;
  updatedAt: string;
}

/**
 * `CreateBotDto` — `POST /classbot/bots`. `name` 필수(≤100자). 나머지는 선택(null 허용) — `subject`·`grade` ≤50,
 * `tone` ≤100, `greeting` ≤1000, `avatarEmoji` ≤16, `scope` 1~5(미지정 3), `quickPrompts` ≤10개·항목 ≤200자.
 */
export interface CreateBotBody {
  name: string;
  subject?: string | null;
  grade?: string | null;
  tone?: string | null;
  greeting?: string | null;
  scope?: number | null;
  avatarEmoji?: string | null;
  quickPrompts?: string[] | null;
}

/**
 * `UpdateBotDto` — `PATCH /classbot/bots/:id`(owner 만 · 남의 봇 404). **`undefined` = 그대로, 텍스트 칸 `null` = 비움.**
 * `name`·`scope`·`quickPrompts` 는 null 불허(이름 없는 봇·범위 밖 등급·비배열 프롬프트 차단).
 */
export interface UpdateBotBody {
  name?: string;
  subject?: string | null;
  grade?: string | null;
  tone?: string | null;
  greeting?: string | null;
  scope?: number;
  avatarEmoji?: string | null;
  quickPrompts?: string[];
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

/* ─── 명단 · 교사 대화 열람 · 위험 신호 — pullim-api PR 2·PR 3(ADR-092) · FE PR 7 ─── */

/**
 * `ClassMemberResponseDto` — `GET /classbot/classes/:classId/members`(operator · 남의 반 403 · 없는 반 404) 한 행.
 * 응답은 봉투 없는 배열이고 **활성 멤버십만** 온다(api.md § 2). `displayName` 은 auth 프로필 투영이라 비어 있을 수
 * 있다(탈퇴·부재 → null). `lastActiveAt` 은 그 학생의 대화·제출 중 최신 시각 — 「최근 활동」 칸과 무활동 판정의 원천이다
 * (`risk-signal-rules.ts` 의 `idle` 은 행을 만들지 않고 이 값에서 파생한다).
 */
export interface ClassMemberDto {
  membershipId: string;
  /** 학생 sub. */
  memberId: string;
  displayName: string | null;
  /** ISO 8601. */
  enrolledAt: string;
  isActive: boolean;
  /** ISO 8601 · 활동이 없으면 null. */
  lastActiveAt: string | null;
}

/**
 * `MemberMessageResponseDto` — `GET /classbot/classes/:classId/chat?studentId=`(operator 열람 · api.md § 3.8) 한 행.
 * 학생 self 히스토리(`lib/api/chat-stream.ts` `ChatHistoryMessage`)와 같은 모양에 **`id`** 가 더 있다 — 위험 신호의
 * `messageId` 가 이 값을 가리켜 원문 자리로 뛴다. 교사 열람은 **미완결 user turn 도** 돌려준다(응답이 실패한 위기 발화도
 * 운영자에게 보여야 해서다). 판정 순서는 없는 반 404 → 남의 반 403 → 비멤버 404(`CLASS_MEMBER_NOT_FOUND`).
 */
export interface MemberMessageDto {
  id: string;
  /** 서버는 string — 화면 union(user·assistant)으로는 어댑터(`lib/risk-signals.ts`)가 좁힌다. */
  role: string;
  /** 텍스트 블록·user turn 의 본문. 카드 블록은 null. */
  content: string | null;
  /** ISO 8601. */
  createdAt: string;
  /** 보낸 시점의 봇 id · 옛 행·봇 없는 반은 null. */
  botId: string | null;
  cardType: string | null;
  cardPayload: Record<string, unknown> | null;
  blockIndex: number | null;
}

/**
 * `RiskSignalResponseDto` — `GET …/signals` 의 `signals[]` 원소 · `PATCH /signals/:id/ack` 응답(api.md § 3.9).
 * 🔒 원문 전문은 없다 — `messageId` 로 위 열람 응답에서 자리를 찾는다(원문이 지워졌으면 null). `detail` 은 규칙 매칭 근거
 * (rule·category·tier·occurrences·`context:'academic'`·`downgradedFrom`·`auto`)만이다.
 */
export interface RiskSignalDto {
  id: string;
  studentId: string;
  /** 서버는 string — `answer_seeking·inappropriate·crisis_keyword·repeat_bypass·nonsense·idle`. 화면 union 은 어댑터가 좁힌다. */
  kind: string;
  /** 1~5. crisis_keyword 4 이상은 서버가 crisis 개입을 자동으로 만든다. */
  severity: number;
  messageId: string | null;
  detail: Record<string, unknown>;
  /** ISO 8601. */
  createdAt: string;
  /** 확인한 교사 sub · 미확인 null. */
  ackedBy: string | null;
  /** ISO 8601 · 미확인 null. */
  ackedAt: string | null;
}

/** `StudentSignalSummaryResponseDto` — `summary[]` 원소. 명단 배지·정렬용 집계(확인 여부 무관 · 미확인 수는 `unacked`). */
export interface StudentSignalSummaryDto {
  studentId: string;
  /** kind → 건수(있는 kind 만). */
  counts: Record<string, number>;
  maxSeverity: number;
  /** ISO 8601 — 가장 최근 신호. */
  lastAt: string;
  unacked: number;
}

/**
 * `ClassSignalsResponseDto` — `GET /classbot/classes/:classId/signals?studentId?&acked?&limit?`(operator · 없는 반 404 ·
 * 남의 반 403). `signals` 는 최근순(`created_at DESC`) 상한 목록(기본 50 · 최대 200), `summary` 는 학생별 집계
 * (미확인 많은 순 → 최근순). `studentId` 는 양쪽에, `acked` 는 목록에만 걸린다.
 */
export interface ClassSignalsDto {
  summary: StudentSignalSummaryDto[];
  signals: RiskSignalDto[];
}
