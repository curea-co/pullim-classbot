/**
 * 수업방·참여 코드·과제 API 응답 계약 — 타입만 있는 파일(런타임 코드 없음).
 *
 * 서버(라우트)와 클라이언트(훅)가 **같은 타입**을 보게 하려고 계약을 여기 한 곳에 둔다.
 * `import type` 으로만 쓰이므로 이 파일은 번들에 남지 않는다 — 클라이언트가 읽어도
 * 서버 모듈이 딸려 오지 않는다.
 */

/** 과제 행 — `assignments` 테이블 컬럼 그대로(타임스탬프는 JSON 직렬화로 문자열). */
export interface AssignmentRow {
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
  targetStudentIds: string[];
  dispatchStatus: 'draft' | 'sent' | 'scheduled' | 'withdrawn';
  createdBy: string | null;
  dispatchedAt: string | null;
  examTimeLimitMin: number | null;
  requizQuestionIds: string[] | null;
}

/* ── 교사 ─────────────────────────────────────────────── */

/** `GET /api/teacher/classrooms` 한 칸. */
export interface TeacherClassroomItem {
  classroomId: string;
  label: string;
  organization: string;
  /** 짝지어진 봇. 참여 행도 코드도 없는 빈 반이면 null. */
  botId: string | null;
  botName: string | null;
  subject: string | null;
  grade: string | null;
  studentCount: number;
  /** 지금 살아 있는 참여 코드(하이픈 없는 대문자 6자). 발급 전이면 null. */
  joinCode: string | null;
  /**
   * 짝 봇이 마켓에 걸려 있나. 짝 봇이 없는 반은 게시할 것도 없으므로 false 다.
   *
   * 이 칸이 여기 있는 이유: 없으면 교사 카드가 배지 하나 때문에 마켓 목록 전체
   * (**남의 봇까지**)를 받아 와야 한다. 내 반 목록이 공개 목록에 매이는 것도,
   * 불리언 하나에 그만한 응답이 딸려 오는 것도 맞지 않는다. 이 조회는 이미
   * `class_bots` 를 읽고 있어서 컬럼이 바로 옆에 있다.
   */
  isPublished: boolean;
  /** 게시한 시각(ISO). 안 걸렸거나 짝 봇이 없으면 null. */
  publishedAt: string | null;
  /** 마켓 카드 한 줄 소개. 내려도 지워지지 않아 다시 걸 때 그대로 채워 준다. */
  publishBlurb: string | null;
}

/** `GET /api/teacher/classrooms` 응답. */
export interface TeacherClassroomsResponse {
  classrooms: TeacherClassroomItem[];
}

/** `classrooms` 테이블 한 행. */
export interface ClassroomRow {
  id: string;
  label: string;
  organization: string;
  teacherId: string | null;
}

/** `class_bots` 테이블 한 행. */
export interface ClassBotRow {
  id: string;
  name: string;
  avatarEmoji: string;
  teacherId: string | null;
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
  createdAt: string;
  /** 마켓에 걸려 있나. */
  isPublished: boolean;
  /** 게시한 시각(ISO). 내리면 다시 null 이라 「게시 중」의 두 번째 증거이기도 하다. */
  publishedAt: string | null;
  /** 마켓 카드 한 줄 소개. 안 적고 게시할 수 있어서 null 이 정상값이다. */
  publishBlurb: string | null;
}

/** `POST /api/teacher/classrooms` 본문. */
export interface CreateClassroomInput {
  label: string;
  subject: string;
  grade: string;
  organization?: string;
  botName?: string;
}

/** `POST /api/teacher/classrooms` 응답. */
export interface CreateClassroomResponse {
  classroom: ClassroomRow;
  bot: ClassBotRow;
  /** 개설과 함께 발급된 참여 코드. */
  joinCode: string;
}

/** `POST /api/teacher/classrooms/[id]/join-codes` 응답. */
export interface IssueJoinCodeResponse {
  joinCode: string;
}

/** `GET /api/teacher/classrooms/[id]/students` 한 줄. */
export interface ClassroomStudentItem {
  id: string;
  name: string;
  /** 참여 시각(ISO). */
  joinedAt: string;
}

/** `GET /api/teacher/classrooms/[id]/students` 응답. */
export interface ClassroomStudentsResponse {
  students: ClassroomStudentItem[];
}

/** `POST /api/teacher/assignments` 본문. */
export interface DispatchAssignmentInput {
  botId: string;
  title: string;
  dueLabel: string;
  questionCount: number;
  difficulty: '하' | '중' | '상';
  mode: 'practice' | 'exam' | 'wrong-conquest';
  /** 교사가 고른 단원(표시 문자열). 생략하면 '단원 미정'·''·'' 로 떨어진다. */
  scope?: string;
  chapterFrom?: string;
  chapterTo?: string;
  /** 생략·빈 배열이면 반 전체. */
  targetStudentIds?: string[];
}

/** `POST /api/teacher/assignments` 응답. */
export interface DispatchAssignmentResponse {
  assignment: AssignmentRow;
}

/** `GET /api/teacher/assignments` 응답. */
export interface TeacherAssignmentsResponse {
  assignments: AssignmentRow[];
}

/* ── 학생 ─────────────────────────────────────────────── */

/** 학생이 보는 수업방 한 칸(`GET /api/me/classrooms`, 학부모 자녀 요약 공용). */
export interface StudentClassroomItem {
  classroomId: string;
  label: string;
  organization: string;
  botId: string;
  botName: string;
  botAvatarEmoji: string;
  subject: string;
  grade: string;
  teacherName: string;
  /** 참여 시각(ISO). */
  joinedAt: string;
  /** 참여 경로 표기(학원·학교 이름). */
  via: string;
}

/** `GET /api/me/classrooms` 응답. */
export interface MyClassroomsResponse {
  classrooms: StudentClassroomItem[];
}

/** `enrollments` 테이블 한 행. */
export interface EnrollmentRow {
  botId: string;
  studentId: string;
  classroomId: string;
  classroomLabel: string;
  assignedBy: string;
  assignedAt: string;
  via: string;
}

/** `POST /api/enrollments` 본문. */
export interface JoinByCodeInput {
  code: string;
}

/** `POST /api/enrollments` 응답 — 이미 참여 중이었으면 `alreadyJoined:true` + 200. */
export interface JoinByCodeResponse {
  enrollment: EnrollmentRow;
  alreadyJoined: boolean;
}

/* ── 학부모 ───────────────────────────────────────────── */

/** `GET /api/parent/children` 한 명. */
export interface ParentChildItem {
  id: string;
  name: string;
  /** 관계(mother/father/guardian). */
  relation: 'mother' | 'father' | 'guardian';
  classrooms: StudentClassroomItem[];
  assignments: AssignmentRow[];
}

/** `GET /api/parent/children` 응답. */
export interface ParentChildrenResponse {
  children: ParentChildItem[];
}

/* ── 마켓플레이스 ─────────────────────────────────────── */

/**
 * 마켓 카드 한 장 — `GET /api/marketplace/bots` · `.../[botId]` 공용.
 *
 * `class_bots` 행을 그대로 흘리지 않고 **마켓이 보여줄 것만** 추린 모양이다.
 * 라이브 상태·빠른 질문·현재 수업 같은 운영 필드는 참여자에게나 쓸모가 있고,
 * 둘러보는 사람에게 내보내면 남의 수업방 운영 상황이 새 나간다.
 */
export interface MarketplaceBotItem {
  botId: string;
  name: string;
  avatarEmoji: string;
  subject: string;
  grade: string;
  tone: '정중' | '친근' | '스파르타' | '차분' | '열정';
  greeting: string;
  /** 교사가 적은 한 줄 소개. 안 적었으면 null — 카드가 대체 문구를 고른다. */
  blurb: string | null;
  teacherName: string;
  organization: string;
  /** 게시 시각(ISO). 목록은 이 값의 내림차순이다. */
  publishedAt: string | null;
  /** 지금 이 봇에 참여 중인 학생 수(`enrollments` 실측). */
  enrolledCount: number;
}

/** `GET /api/marketplace/bots` 응답. */
export interface MarketplaceBotsResponse {
  bots: MarketplaceBotItem[];
}

/** `GET /api/marketplace/bots/[botId]` 응답. */
export interface MarketplaceBotResponse {
  bot: MarketplaceBotItem;
}

/** `POST /api/teacher/bots/[botId]/publish` 본문 — 본문 자체를 생략해도 게시된다. */
export interface PublishBotInput {
  /**
   * 한 줄 소개(다듬은 뒤 200자 이내).
   *
   * **이 요청이 소개를 통째로 정한다** — 생략도 빈 문자열도 똑같이 「없음」이라
   * 저장돼 있던 소개를 지운다. 그러니 안 고칠 때도 **저장된 값을 그대로 실어 보내라.**
   * 그 값은 `TeacherClassroomItem.publishBlurb` 에서 읽는다(게시를 내려도 읽힌다).
   */
  blurb?: string;
}

/**
 * 게시·내리기 응답 — 바뀐 봇 행 그대로.
 * 화면이 응답만 보고 배지를 다시 그릴 수 있게 `isPublished`·`publishedAt` 을 함께 돌려준다.
 */
export interface PublishBotResponse {
  bot: ClassBotRow;
}

/* ── 자기주도 ─────────────────────────────────────────── */

/**
 * `self_enrollments` 한 행 — **P1 에서 이미 고정된 모양 그대로**
 * (`lib/store/self-learning.ts` 의 `SelfBotRow`). 서버가 소스가 되어도 훅이 필드를
 * 다시 매핑하지 않도록 여기서도 같은 두 칸만 둔다.
 */
export interface SelfBotRow {
  /** 마켓이 주는 **`class_bots.id`**. 은퇴한 mock 카탈로그 id(`ot_*`) 아님. */
  botId: string;
  /** 담은 시각(ISO 8601). */
  addedAt: string;
}

/** `GET /api/me/self-bots` 응답 — 담은 순 오름차순. */
export interface MySelfBotsResponse {
  bots: SelfBotRow[];
}

/** `POST /api/me/self-bots` 본문. */
export interface AddSelfBotInput {
  botId: string;
}

/** `POST /api/me/self-bots` 응답 — 새로 담았으면 201, 이미 담았으면 200(둘 다 같은 몸통). */
export interface AddSelfBotResponse {
  bot: SelfBotRow;
}

/**
 * `DELETE /api/me/self-bots/[botId]` 응답.
 *
 * `removed:false` 는 실패가 아니라 **없던 것을 뺐다**는 뜻이다 — 부르는 쪽의 의도
 * (「이건 내 목록에 없어야 한다」)는 어느 쪽이든 이미 이뤄져 있다.
 */
export interface RemoveSelfBotResponse {
  removed: boolean;
}

/**
 * `GET /api/me/study-days` 응답 — `'YYYY-MM-DD'` **오름차순·중복 없음**.
 *
 * 연속일수는 여기 없다. 숫자를 저장하지도 내려보내지도 않고 **날짜에서 계산한다**
 * (`deriveStreak`) — 카운터는 어느 날들로 그 수가 나왔는지 알 수 없어 검증할 수 없다.
 */
export interface MyStudyDaysResponse {
  days: string[];
}

/** `POST /api/me/study-days` 본문 — 날짜를 생략하면 **서버의 오늘(KST)**. */
export interface RecordStudyDayInput {
  /** `'YYYY-MM-DD'`. 미래이거나 2년보다 오래됐거나 형식이 어긋나면 400. */
  date?: string;
}

/**
 * `POST /api/me/study-days` 응답 — 새로 기록했으면 201, 이미 있었으면 200(둘 다 같은 몸통).
 * `date` 는 **서버가 실제로 저장한 날**이라, 생략해 보낸 쪽은 이 값으로 오늘을 안다.
 */
export interface RecordStudyDayResponse {
  recorded: true;
  date: string;
}

/** `POST /api/me/study-days/backfill` 본문 — 한 번에 400개까지(넘으면 400 `INVALID_INPUT`). */
export interface BackfillStudyDaysInput {
  days: string[];
}

/**
 * `POST /api/me/study-days/backfill` 응답.
 *
 * `skipped` 는 **보낸 개수에서 새로 생긴 행을 뺀 나머지 전부**다 — 형식이 어긋난 값,
 * 미래, 2년 이전, 요청 안의 중복, 그리고 이미 서버에 있던 날이 한데 들어간다.
 * 이유를 갈라 세지 않는 것은 계약이 그렇게 정했기 때문이고(§2), 실제로 부르는 쪽은
 * 「몇 개가 남았나」만 쓴다.
 */
export interface BackfillStudyDaysResponse {
  inserted: number;
  skipped: number;
}

/* ── 동의 · 학부모 자기주도 ──────────────────────────── */

/**
 * `consent_logs.type` 이 받는 값 전부 — 스키마의 enum 배열과 **같은 여섯**.
 *
 * 스키마에서 `import type` 으로 끌어오지 않고 여기 따로 적는다. 이 파일의 약속이
 * 「런타임 코드 없음 · 서버 모듈이 딸려 오지 않음」이라(위 머리주석), 타입만이라도
 * 서버 모듈을 가리키기 시작하면 다음 사람이 그 옆에 값 import 를 붙인다.
 * **갈라짐은 `app/api/_lib/consent.ts` 의 `ContractMatchesSchema` 가 typecheck 로 잡는다** —
 * 한쪽만 고치면 빌드가 깨지므로 이 중복은 방치되지 않는다.
 *
 * ⚠️ 이 중 **학생이 스스로 켤 수 있는 값은 둘**이다 — `'self_study_summary'` 와
 * `'class_assignment_summary'`. 나머지 다섯은 교사·기관 승인이라는 다른 인가 모델 위에 있다
 * (`STUDENT_GRANTABLE_TYPES`). 「목록에 있으니 학생이 켤 수 있다」로 읽지 마라.
 */
export type ConsentTypeValue =
  | 'weekly_report'
  | 'monthly_report'
  | 'weak_nodes'
  | 'emotion_share'
  | 'realtime_alert'
  | 'self_study_summary'
  | 'class_assignment_summary';

/**
 * 학생이 준 동의 한 줄 — `GET /api/me/consents` · `POST /api/me/consents` 공용.
 *
 * `parentId` 를 싣지 않는다. **본문으로 받지 않는 값을 응답으로 돌려주면** 다음 사람이
 * 「그럼 보내도 되나」로 읽는다. 받는 사람은 `parent_child_links` 가 정하지 요청이 정하지
 * 않는다(계약 §2). 받는 사람을 **화면에 이름으로** 보여야 하는 건 별개의 필요라,
 * id 가 아니라 `MyConsentsResponse.parent` 의 이름·관계가 답한다.
 *
 * `revokedAt` 도 없다 — 이 목록은 **살아 있는 동의**만 담는다. 거둔 기록은 DB 에 남지만
 * (감사 기록) 화면에 「예전에 줬던 것」 목록을 그리지 않는 것이 이번 계약의 범위다.
 */
export interface MyConsentRow {
  /**
   * `consent_logs.type`. 조회는 **타입으로 거르지 않으므로** 일곱 중 무엇이든 올 수 있다
   * (지금 DB 에는 학생이 켠 둘만 있지만, 다른 인가 모델이 행을 넣기 시작하면 여기 섞인다).
   * 한 값으로 좁혀 놓고 쓰면 그날 화면이 조용히 틀린다.
   */
  type: ConsentTypeValue;
  /**
   * 학생이 고른 범위 — `'계속'` · `'이번 달만'` · `'이번 주만'`.
   *
   * **union 이 아니라 `string` 이다.** DB 의 `scope_label` 은 CHECK 없는 `text` 라
   * 세 값을 강제하는 것이 없고, 이 칸은 애초에 **사람이 읽는 문장을 그대로 저장한 것**이라
   * (`SCOPE_LABELS` 주석) 화면은 분기하지 말고 **그대로 출력**하면 된다. 새 범위가 생겨도
   * 화면은 안 고쳐도 된다 — 좁혀 두면 그때 고쳐야 한다.
   * 값을 **만드는** 쪽(범위 고르기 UI)은 `ScopeLabel` union 을 쓴다.
   */
  scopeLabel: string;
  /** 준 시각(ISO 8601) — 화면의 「언제부터」. */
  grantedAt: string;
  /** 만료(ISO 8601). `'계속'` 이면 null — 학생이 거둘 때까지다. */
  expiresAt: string | null;
  /**
   * 이 동의가 **지금 보호자**(`MyConsentsResponse.parent`)에게 가는가.
   *
   * ## 왜 boolean 인가 — 목록을 좁히지 않기 위해서다
   *
   * 링크의 주 보호자가 바뀌어도 **옛 보호자에게 준 살아 있는 동의는 그대로 유효하다**
   * (학부모 조회는 `consent_logs.parent_id = parent_child_links.parent_id` 로 열린다 —
   * 그 링크가 남아 있는 한 열람도 남는다). 그래서 조회에서 지금 보호자 것만 돌려주면
   * **학생이 보지도 끄지도 못하는 살아 있는 권한**이 생긴다. 숨기는 대신 전부 싣고,
   * 어디로 가는지를 이 칸이 말한다.
   *
   * ⛔ **보호자 id·이름을 대신 싣지 마라.** 「누구에게」를 이름으로 답하는 자리는
   * `MyConsentsResponse.parent` 하나뿐이고, 그건 **지금 보호자**다. 옛 보호자의 이름을
   * 실으면 학생 화면이 아직 이어지지 않은 사람의 신원을 새로 알려 주는 자리가 된다.
   * 학생에게 필요한 것은 「저쪽에도 열려 있다 · 여기서 끌 수 있다」이지 그 사람이 누구인지가
   * 아니다(끄기는 `(학생, 타입)` 기준이라 받는 사람을 몰라도 꺼진다).
   */
  toCurrentParent: boolean;
}

/**
 * 이 학생의 동의를 받게 될 보호자 — **이름과 관계만**.
 *
 * id 가 없는 것은 위 `MyConsentRow` 와 같은 이유다(본문으로 받지 않는 값을 응답에 실으면
 * 「보내도 되나」로 읽힌다). 이름·관계는 **되돌려 보낼 수 있는 식별자가 아니라서** 그 문을
 * 열지 않는다 — 부여 라우트는 여전히 본문의 `parentId` 를 400 으로 거절한다.
 *
 * 값의 출처는 부여 라우트가 쓰는 것과 **같은 함수**다(`resolveGrantRecipient`). 그래서
 * 화면에 뜬 이름은 「지금 켜면 이 사람에게 간다」와 **같은 사람임이 보장된다** — 조회와
 * 부여가 링크를 각자 고르면 그 보장이 우연이 된다.
 */
export interface MyConsentParent {
  name: string;
  relation: 'mother' | 'father' | 'guardian';
}

/**
 * `GET /api/me/consents` 응답 — **살아 있는** 동의만, 준 순(오래된 것 먼저).
 *
 * `parent` 가 `null` 이면 **이 학생은 지금 동의를 줄 수 없다** — 부여 라우트가
 * 400 `공유할 보호자가 연결되어 있지 않아요.` 로 답하는 바로 그 상태다. 화면은 스위치를
 * 그려 놓고 눌러 보게 해서 알려 주는 대신, **미리 「아직 연결된 보호자가 없어요」를 그린다.**
 */
export interface MyConsentsResponse {
  parent: MyConsentParent | null;
  consents: MyConsentRow[];
}

/**
 * `POST /api/me/consents` 본문.
 *
 * ⛔ `parentId` 도 `expiresAt` 도 **여기 없다, 있어도 무시가 아니라 거절이다.**
 * 받는 사람을 본문이 정하면 학생이 남에게 자기 기록을 넘길 수 있고, 만료를 본문이
 * 정하면 「이번 주만」에 서기 3000년을 적어 보낼 수 있다. 둘 다 서버가 정한다(계약 §2).
 */
export interface GrantConsentInput {
  type: string;
  scopeLabel: string;
}

/**
 * `POST /api/me/consents` 응답 — 새로 줬으면 201, 살아 있던 동의를 갱신했으면 200
 * (둘 다 같은 몸통).
 */
export interface GrantConsentResponse {
  consent: MyConsentRow;
}

/**
 * `DELETE /api/me/consents/[type]` 응답.
 *
 * `revoked:false` 는 실패가 아니라 **줄 게 없었다**는 뜻이다 — 부르는 쪽의 의도
 * (「이건 공유되지 않아야 한다」)는 어느 쪽이든 이미 이뤄져 있다(담은 봇 빼기와 같은 규약).
 */
export interface RevokeConsentResponse {
  revoked: boolean;
}

/** 학부모가 보는 「스스로 담은 봇」 한 장. */
export interface ParentSelfStudyBot {
  botId: string;
  name: string;
  subject: string;
  /**
   * 봇 얼굴 이모지 — 아이가 보는 것과 **같은 것**을 부모도 본다.
   *
   * 아이는 🧑‍🔬 를 보고 「과학봇」이라 부르는데 부모 화면에는 회색 글리프가 떠 있으면,
   * 둘이 같은 봇을 이야기하면서 서로 다른 것을 보고 있다. 새로 여는 정보가 아니라
   * **이미 주기로 한 봇을 정직하게 그리는 것**이다(마켓 카드도 같은 값을 쓴다).
   *
   * ⚠️ **`null` 이 오지 않는다.** `class_bots.avatar_emoji` 는 `NOT NULL DEFAULT '🤖'` 라
   * 이모지를 안 고른 봇도 빈 값이 아니라 **`'🤖'`** 로 온다.
   *
   * ⛔ **그러니 `'🤖'` 를 「비어 있음」으로 보고 다른 글리프로 바꿔 그리지 마라.** 그 봇은
   * **아이 화면에도 🤖 로 떠 있다.** 부모 쪽만 회색 아이콘으로 갈아 끼우면 이 필드가 없애려던
   * 어긋남(둘이 같은 봇을 이야기하면서 다른 걸 보고 있음)을 **정확히 그 자리에서 다시 만든다.**
   * 물음은 「빈 값을 무엇으로 채우나」가 아니라 **「부모가 아이와 같은 것을 보는가」**다.
   *
   * 대체가 필요하다면 대체값도 `'🤖'` 여야 한다 — 학생 쪽 `my-bot-card.tsx` 와 같은 모양
   * (`bot.avatarEmoji || '🤖'`). 그 `||` 가 잡는 건 빈 문자열뿐이고, 컬럼 기본값 때문에
   * 그 값은 나오지 않아야 정상이다. 두 화면이 **같이** 무너지게 두는 장치일 뿐이다.
   */
  avatarEmoji: string;
  /** 담은 날(ISO 8601) — 화면은 「시작한 날」로 읽는다. */
  addedAt: string;
}

/**
 * 학부모가 보는 연속 학습.
 *
 * 서버가 **날짜에서 계산해** 내려준다 — 학부모 화면에 날짜 배열을 통째로 주지 않는다.
 * 「어느 날 공부했는지」의 목록은 요약보다 촘촘한 정보이고, 계약이 준 것은 요약이다.
 */
export interface ParentSelfStudyStreak {
  /** 마지막 학습일부터 거꾸로 이어지는 구간의 길이(`deriveStreak` 과 같은 뜻). */
  count: number;
  /** `'YYYY-MM-DD'`. 한 번도 없으면 null. */
  lastStudyDate: string | null;
  /** 이번 주(KST 월요일 시작) 공부한 날 수 — 0~7. */
  thisWeekDays: number;
}

/**
 * `GET /api/parent/children/self-study` 의 자녀 한 명.
 *
 * ⛔ **동의하지 않은 자녀는 이 배열에 아예 없다** — 필드가 null 로 오는 게 아니다.
 * 조회가 `INNER JOIN consent_logs` 라 미동의 자녀는 결과 집합에서 통째로 빠진다.
 * 그래야 화면이 따로 기억하지 않아도 「미동의」와 「무활동」이 같아 보인다(계약 §2·§3).
 *
 * 그래서 **필드 마스킹을 쓰지 마라.** 동의 타입 하나 = 응답 블록 하나이고, 새 필드의
 * 기본값은 「안 나감」이어야 한다. 여기에 null 자리를 만들면 다음 사람이 그 자리에
 * 감정·대화 요약을 넣는다.
 */
export interface ParentSelfStudyChild {
  id: string;
  name: string;
  relation: 'mother' | 'father' | 'guardian';
  /** 자녀가 고른 공유 범위 — 카드 머리에 그대로 표시한다(범위를 숨기지 않는다). */
  scopeLabel: string;
  /** 동의 만료(ISO 8601). `'계속'` 이면 null. */
  expiresAt: string | null;
  /** 스스로 담은 봇 — 담은 순(오래된 것 먼저). */
  bots: ParentSelfStudyBot[];
  streak: ParentSelfStudyStreak;
}

/**
 * `GET /api/parent/children/self-study` 응답.
 *
 * `GET /api/parent/children` 과 **일부러 분리했다.** 한 응답에 인가 모델이 둘
 * (교사 파생 = 무조건 / 자기주도 = 동의 게이트)이 되면 다음 사람이 새 필드를 어느
 * 규칙으로 더할지 알 수 없다(계약 §2).
 *
 * ⛔ 단원 진행은 여기 없다 — P5 다(`bot_curriculum_units` 가 비어 있다).
 * 대화 원문·요약, 문항별 오답, 감정·웰빙도 없다 — 문서가 고정한 「넘지 않는 선」이다.
 */
export interface ParentSelfStudyResponse {
  children: ParentSelfStudyChild[];
}
