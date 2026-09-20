/**
 * pullim-api classbot 응답 DTO — FE 쪽 거울.
 *
 * 정본은 pullim-api `src/classbot/modules/{assignment,classroom,bot,chat,signal}/controller/dto/*.ts` 와
 * `service/*.types.ts` 다(2026-09-17 · dev `2d24f323`). 필드를 하나씩 옮겨 적었고,
 * 서버가 `string` 으로 열어 둔 칸(mode·difficulty·state·tone·dispatchStatus)은 여기서도 string 이다 —
 * 화면 union 으로 좁히는 일은 어댑터(`app/(student)/classbot/assignment/use-assignment-reads.ts` 의
 * `toAssignmentReadRow`, `components/classbot/home/my-rooms.ts` 의 `toSlot`)가 한다.
 *
 * 목록 응답은 **봉투 없는 배열**이다 — `GET /classbot/assignments` 는 `AssignmentSummaryDto[]`,
 * `GET /classbot/bots` 는 `BotCardDto[]`. 같은 오리진 `/api/*` 의 `{ assignments: [...] }` 봉투와 다르다.
 *
 * **봇은 이제 두 뜻이다(ADR-092 · pullim-api PR 1·2, 2026-09-17 `origin/dev`)** — 이 파일이 둘을 갈라 적는다.
 *  - `GET /classbot/bots?role=`·`GET /classbot/bots/:id` 의 **탐색 키는 아직 반이다**(ADR-063 잔재 · ADR-092 open ①) —
 *    `id` 가 `classes.id` 고 404/403 도 그대로다. 바뀐 것은 **그 안을 어느 표에서 읽느냐**다(pullim-api #679):
 *    `name` 이 **봇 이름**(`bots.name`)이고 반 이름은 **`className`** 으로 따로 오며, `profile` 의 페르소나 칸도
 *    `bots` 에서 온다. 붙은 봇이 없는 반은 `botId`·`profile` 이 null 이고 `name` 이 반 이름으로 떨어진다.
 *    `BotCardDto`·`BotDetailDto` 가 그것.
 *  - `GET /classbot/me/bots`·`POST/PATCH /classbot/bots`·`PUT /classbot/classes/:classId/bot` 은 **1급 `bots` 표**를
 *    읽고 만지고 `BotDto` 로 답한다. 반이 어느 봇을 가리키는지(`classes.bot_id`)는 `ClassDto.bot` 으로 오고,
 *    그 `ClassDto` 를 주는 문은 이제 셋이다 — 반 생성(`POST /classes`) · 봇 할당(`PUT …/bot`) · **읽기
 *    `GET /classes/:classId`**(pullim-api #672 · api.md § 1). 화면이 「지금 붙은 봇」을 어떻게 다루는지는
 *    `hooks/api/classroom.ts` `useClassDetail` 머리주석.
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
  /**
   * 📥 **요청자 본인이 이 과제를 냈는가** — `true` 냄 · `false` 안 냄 · `null` 「냈는지」라는 개념이 없는 관점
   * (반 operator: `audience=teacher` 목록 · operator 가 읽은 상세 · 배포 201 응답). pullim-api #681 이 낸 칸이라
   * **그 전 서버 응답에는 이 키가 아예 없다** — 그래서 `?` 다. 키가 없는 것은 「안 냄」이 아니라 **「모른다」**다
   * (`use-assignment-reads.ts` 의 `toAssignmentReadRow` 가 그 셋을 가른다).
   *
   * ⚠ **제출 여부를 `state` 에서 읽지 마라.** `state` 는 교사가 낼 때 보낸 값이 그대로 돌아오는 자유 문자열이고
   * **과제 한 건에 하나뿐**이라 모든 학생에게 같은 값이다(pullim-api api.md § 3.6 · #681 DTO 주석).
   */
  submitted?: boolean | null;
  /** 📥 본인 제출 시각(ISO 8601) — 미제출·operator 관점이면 `null`. #681 이전 응답에는 키가 없다. */
  submittedAt?: string | null;
  /**
   * 📥 본인 제출의 서버 권위 채점값(0~100). **`0`(전부 오답)과 `null` 은 다른 값이다** —
   * `null` 은 미채점(서술형 등 자동채점 불가 포함)·미제출·operator 관점이다. 「냈는지」는 이 칸이 아니라
   * 위 `submitted` 가 말한다. #681 이전 응답에는 키가 없다.
   */
  scorePercent?: number | null;
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

/**
 * `AssignmentDetailResponseDto` — 요약 + 문항. `GET /classbot/assignments/:id`.
 * 본인 제출 세 칸(`submitted`·`submittedAt`·`scorePercent`)도 요약에서 그대로 물려받는다 —
 * 상세도 목록과 같은 값을 싣는다(pullim-api #681).
 */
export interface AssignmentDetailDto extends AssignmentSummaryDto {
  questions: AssignmentQuestionDto[];
}

/**
 * `BotProfileView` — 카드·상세의 `profile` 칸. **입력원이 갈려 있다**(pullim-api #679 · ADR-092):
 * 페르소나 일곱 칸(과목·학년·말투·인사말·scope·아바타·quickPrompts)은 그 반에 붙은 봇(`classes.bot_id` → `bots`)에서,
 * 마지막 세 칸(`enrolledCount`·`isLive`·`currentLesson`)은 **반의 상태**라 아직 `class_bot_profiles` 에서 온다.
 *
 * **`null` 인 조건이 바뀌었다** — 종전 「profile 행이 없다」에서 **「붙은 봇이 없다」**로. 그래서 봇이 붙은 반은
 * 이제 profile 이 실린다(`class_bot_profiles` 행이 없어도). 옛 profile 행으로 페르소나를 되살리지는 않는다 —
 * 그 값은 이행 스냅샷이라 교사가 그 뒤 봇을 고쳤으면 틀렸다.
 *
 * 페르소나 텍스트 칸이 **`null` 로 올 수 있다** — `bots` 가 null 을 허용하고 `PATCH /bots/:id` 의 `null` 이
 * 「비움」이라 그게 그대로 보인다. 읽는 쪽은 `??` 로 접는다(`my-rooms.ts` 의 `toSlot`).
 */
export interface BotProfileDto {
  subject: string | null;
  grade: string | null;
  /** 서버는 string — 화면 union(정중·친근·스파르타·차분·열정)으로는 어댑터가 좁힌다. */
  tone: string | null;
  greeting: string | null;
  /** ScopeLevel 1~5(`bots.scope` · 서버 기본 3). 봇이 붙어 있으면 이 값이 그 봇의 등급이다. */
  scope: number;
  avatarEmoji: string | null;
  /** 서버는 문장만 준다 — 화면의 `ClassbotQuickPrompt`(text + expectedReplyKey)와 모양이 다르다. */
  quickPrompts: string[];
  /** 반의 상태(`class_bot_profiles.enrolled_count`) — 행이 없으면 0. */
  enrolledCount: number;
  /** 반의 상태(`class_bot_profiles.is_live`) — 행이 없으면 false. */
  isLive: boolean;
  /** 반의 상태(`class_bot_profiles.current_lesson`) — 행이 없으면 null. */
  currentLesson: Record<string, unknown> | null;
}

/** `BotCardResponseDto` — `GET /classbot/bots?role=` 한 행. */
export interface BotCardDto {
  /** 반 id(`classes.id`) — 탐색 키. 대화·과제·멤버십이 전부 이 값으로 걸린다. */
  id: string;
  /**
   * 그 반에 붙은 봇 id(`classes.bot_id`) — 미배정이면 null. **`id` 와 다른 세계의 값이다.**
   * 없으면 아래 `name` 이 반 이름 폴백이라는 뜻이기도 하다.
   * `className` 이 없던 옛 응답과 새 응답을 가르는 데 쓸 수 있다.
   */
  botId?: string | null;
  /** **봇 이름**(`bots.name`) — 봇 미배정 반은 반 이름으로 떨어진다. 옛 응답(#679 이전)에서는 반 이름이었다. */
  name: string;
  /** 반 이름(`classes.name`). **pullim-api #679 가 낸 칸이라 그 전 응답에는 없다** — 읽는 쪽이 폴백을 진다. */
  className?: string;
  description: string | null;
  isActive: boolean;
  /** 요청자 관점 — operator 면 teacher, member 면 student. */
  role: 'teacher' | 'student';
  profile: BotProfileDto | null;
}

/** `BotDetailResponseDto` — `GET /classbot/bots/:id`. 커리큘럼·설정 칸은 이 앱이 아직 읽지 않아 적지 않았다. */
export interface BotDetailDto {
  /** 반 id(`classes.id`) — 탐색 키. */
  id: string;
  /** 그 반에 붙은 봇 id(`classes.bot_id`) — 미배정이면 null. #679 가 낸 칸(그 전 응답에는 없다). */
  botId?: string | null;
  /** **봇 이름**(`bots.name`) — 봇 미배정 반은 반 이름 폴백. */
  name: string;
  /** 반 이름(`classes.name`) — #679 가 낸 칸(그 전 응답에는 없다). */
  className?: string;
  description: string | null;
  isActive: boolean;
  /** 운영자(교사) sub — 표시명은 없다(계획 §10 해소 5 · pullim-api PR 2 members 조인). */
  operatorId: string;
  profile: BotProfileDto | null;
}

/**
 * 이 카드(또는 상세)가 말하는 **반 이름** — 화면에서 반을 부를 때는 **반드시 이 함수를 거친다.**
 *
 * pullim-api #679 부터 `name` 은 **봇 이름**이고 반 이름은 `className` 으로 따로 온다. 그 전 응답에는
 * `className` 이 없고 `name` 이 곧 반 이름이었다.
 *
 * ## `?? card.name` 은 방어 코드가 아니라 **머지 순서를 여는 장치**다 — 걷지 마라
 *
 * 이 폴백이 있어서 **FE 를 #679 보다 먼저 머지해도 된다.** 그 편이 오히려 안전하다:
 * BE 배포는 pre-deploy 게이트 + ECR + ECS 로 30분이 넘고 FE(Vercel)는 몇 분이라, BE 를 먼저 올리면
 * **그 30분 동안 교사 과제 배포 드롭다운이 봇 이름으로 서 있다**(아래 ⚠ — 오배포 위험). 반대로 FE 가 먼저면
 * 위험 창이 **아예 없다**:
 *  - **#679 배포 전** — `className` 이 없으니 `name` 으로 떨어진다 = **지금과 한 글자도 다르지 않은 동작.**
 *  - **#679 배포 후** — `className` 이 실리면서 저절로 맞아진다. 이 함수 밖은 손대지 않는다.
 *
 * ⚠ **그 사이에는 봇 이름 자리와 반 이름 자리가 여전히 같은 값**이다(지금 상태 그대로다).
 * 그건 이 PR 이 못 고치는 것이 아니라 **고칠 것이 아직 서버에 없는 것**이고, #679 가 해소한다.
 *
 * **걷을 조건**: #679 가 **prod 까지** 가서 모든 응답이 `className` 을 싣게 되면 이 폴백은 죽은 코드다.
 * 그때 `BotCardDto.className`·`BotDetailDto.className` 을 `?` 없는 필수 칸으로 좁히고 이 함수를
 * `card.className` 한 줄로 줄인다(타입이 남은 호출부를 전부 짚어 준다).
 *
 * **빈 값으로 떨어뜨리지 않는 이유**: 반 이름이 서는 자리는 제목·이름표·선택지다 —
 * 학생 「내 수업방」 카드 제목과 나가기·과제 링크의 aria-label, 홈 「참여 중인 클래스」 줄, 「내 정보」 줄,
 * 교사 「내 수업방」 목록 제목과 반 상세 제목, **과제 배포 반 고르기 드롭다운**, 관제소 반 고르기,
 * 봇 빌더의 「붙일 반」 칩. 비우면 제목이 사라지고 고를 수 없는 빈 선택지가 된다.
 *
 * ⚠ **`name` 을 반 이름으로 읽지 마라.** ADR-092 로 **한 봇이 여러 반을 섬긴다** — 같은 봇을 건 두 반은
 * `name` 도 `profile`(과목·학년)도 **같은 `bots` 행**에서 와 완전히 같아진다. 과제 배포 드롭다운에서
 * 그건 표시 회귀가 아니라 **오배포 위험**이다.
 * @param card - `GET /classbot/bots?role=` 한 행 또는 `GET /classbot/bots/:id`
 * @returns 화면이 반을 부를 이름
 */
export function classNameOf(card: Pick<BotCardDto, 'name' | 'className'>): string {
  return card.className ?? card.name;
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
 * 없으면 null). `GET /classbot/classes/:classId`(읽기 — operator 또는 활성 멤버) · `POST /classbot/classes` 의
 * `class` 칸 · `PUT /classbot/classes/:classId/bot` 응답이 모두 이 모양이다.
 * `joinCode` 는 **operator 응답에만** 실린다 — 멤버가 반 상세를 읽으면 늘 null 이다(코드는 운영자 몫).
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
 * `BotResponseDto` — 1급 `bots` 행 + 이 봇을 쓰는 반 id 목록. `GET /classbot/me/bots`(봉투 없는 배열 · 최신순 ·
 * 없으면 `[]`)·`POST /classbot/bots`(201)·`PATCH /classbot/bots/:id`(200).
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
  /**
   * 마켓 공개 — 칸은 있는데 **여는 문이 없다.** pullim-api classbot 에 게시·해제 라우트가 하나도 없어
   * (2026-09-17 `origin/dev` 전수 확인) 이 앱의 봇 마켓은 여전히 같은 오리진 `/api/teacher/bots/:id/publish` 를
   * 쓴다(`hooks/api/marketplace.ts`). 이 칸을 읽어 마켓 상태라고 말하지 마라 — 늘 `false` 다.
   */
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

/* ─── 교사 개입 — pullim-api intervention 모듈(api.md § 3.7 · authz.md § 1.5 (A)·(B) · FE PR 5c) ─── */

/** 개입 유형 넷 — 정본 `INTERVENTION_TYPES`(`send-interventions.dto.ts`) 그대로. */
export const INTERVENTION_TYPES = ['remind', 'requiz', 'comment', 'crisis'] as const;

export type InterventionType = (typeof INTERVENTION_TYPES)[number];

/**
 * `InterventionResponseDto` — 발송 201 한 건 · 학생 인박스 한 줄 · 읽음 200. 🔒 발송 교사(`createdBy`)는 오지 않는다
 * (감사 전용). `botId` 는 **반 id** 다(bot == class · ADR-063) — 그대로 챗 딥링크의 `?classId=` 로 쓴다.
 * `type` 은 서버가 string 으로 연다 — 화면 union 으로 좁히는 일은 `lib/interventions.ts` 의 `interventionMeta` 가 한다.
 */
export interface InterventionDto {
  id: string;
  type: string;
  /** 대상 봇(=반) id. */
  botId: string;
  /** 수신 학생 sub. */
  studentId: string;
  /** 연계 과제 id — **crisis 만 null 이 될 수 있다**(아래 `InterventionEventBody`). */
  assignmentId: string | null;
  message: string;
  /** ISO 8601. */
  createdAt: string;
  /** ISO 8601 · 미읽음 null. */
  readAt: string | null;
}

/**
 * `InterventionEventDto` — 발송 본문의 이벤트 한 개.
 *
 * ⚠ **`assignmentId` 는 비-crisis 에서 필수다.** DTO 상으로는 선택이지만 Service 불변식
 * (`intervention.service.ts` `assertEventShape` · data-model § 1.5)이 `type != 'crisis'` 면 누락을 **400** 으로 막고,
 * 실린 과제가 그 반 소속이 아니어도 400 이다. 그래서 이 앱의 교사 표면(리마인드·코멘트)은 **늘 과제를 하나 고른다.**
 * `crisis` 는 서버가 위험 신호에서 자동으로 만든다(`05 § 3`) — 교사 UI 는 내지 않는다.
 */
export interface InterventionEventBody {
  type: InterventionType;
  /** 수신 학생 sub — `:classId` 의 **활성 멤버**여야 한다(아니면 400). */
  studentId: string;
  assignmentId?: string | null;
  /** 공백만이면 400. */
  message: string;
}

/**
 * `SendInterventionsDto` — `POST /classbot/classes/:classId/interventions`(201 · `InterventionDto[]`).
 * 정본은 단건 객체도 받지만 이 앱은 **늘 `events` 배열**로 보낸다 — 문 하나에 모양 하나가 읽기 쉽다.
 */
export interface SendInterventionsBody {
  events: InterventionEventBody[];
}

/** `MarkAllReadResponseDto` — `PATCH /classbot/interventions/read-all`. 새로 읽음 처리된 건수. */
export interface MarkAllReadDto {
  updated: number;
}
