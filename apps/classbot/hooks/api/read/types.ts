/**
 * 학생 과제 읽기 행 타입 — 화면 다섯이 읽는 모양.
 *
 * 원래는 같은 오리진 읽기 3면(`/api/bots` · `/api/assignments` · `/api/grades`)의 응답 모양을
 * 담던 파일이고, 그래서 행 형태가 `lib/db/schema.ts` 의 컬럼과 1:1 이었다. **그 세 라우트는
 * 계획 PR 8 에서 걷혔다** — 지금 남은 둘은 정본(pullim-api) DTO 를 이 모양으로 옮겨 담는
 * 화면 계약이다(`app/(student)/classbot/assignment/use-assignment-reads.ts` 의 `toAssignmentReadRow`).
 * 그래서 이름만 「Read」로 남았지, 이제 이 모양을 내는 것은 route handler 가 아니라 그 변환기다.
 *
 * 봇·채점 이력 행 타입(`BotReadRow` · `GradeReadRow`)과 봉투 셋은 소비자가 0 이 되어 함께 걷었다.
 */

/** 내게 배정된 과제 한 행. */
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
  /**
   * 푼 문항 수 — **진행도의 원천이 아니라 `submitted` 의 투영이다.** 정본에 「몇 번까지 풀었나」를 담는 칸이
   * 없어(중간 저장은 별건 설계) 냈으면 `questionCount`, 안 냈거나 모르면 0 이다. 자세한 것은
   * `use-assignment-reads.ts` 의 `toAssignmentReadRow`.
   */
  completedCount: number;
  recentAccuracy: number | null;
  /**
   * **내가 이 과제를 냈는가** — 화면이 제출 여부를 읽는 **유일한 칸**이다(아래 `state` 가 아니다).
   *  - `true` — 냈다.
   *  - `false` — 안 냈다. 서버가 그렇게 말한 것이다.
   *  - `null` — **모른다.** ① 서버가 아직 이 칸을 안 싣거나(pullim-api #681 배포 전) ② 운영자 관점이라
   *    「내가 냈나」가 성립하지 않는 경우. **「모른다」를 「안 냄」으로 그리지 마라.**
   */
  submitted: boolean | null;
  /** 내 제출 시각(ISO 8601) — 미제출·모름이면 null. */
  submittedAt: string | null;
  /** 내 제출의 서버 채점값(0~100). **`0` 은 0점이고 `null` 은 「점수가 없다」**(미채점·미제출·모름). */
  scorePercent: number | null;
  /**
   * 교사가 낼 때 보낸 자유 문자열이 그대로 돌아온 값 — **제출 여부가 아니다.** 과제 한 건에 하나뿐이라
   * 모든 학생에게 같은 값이고, 이 앱의 배포 폼은 늘 `'todo'` 를 보낸다. 「냈는가」는 위 `submitted` 가 말한다.
   */
  state: 'todo' | 'in-progress' | 'submitted' | 'overdue';
  reasonHint: string | null;
  solveHref: string;
}

/** 과제 목록 응답 봉투 — `useVisibleAssignments()` 가 이 모양으로 돌려준다. */
export interface AssignmentsReadResponse {
  assignments: AssignmentReadRow[];
}
