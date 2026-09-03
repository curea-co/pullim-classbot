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
