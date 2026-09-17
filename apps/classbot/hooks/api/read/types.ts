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
  completedCount: number;
  recentAccuracy: number | null;
  state: 'todo' | 'in-progress' | 'submitted' | 'overdue';
  reasonHint: string | null;
  solveHref: string;
}

/** 과제 목록 응답 봉투 — `useVisibleAssignments()` 가 이 모양으로 돌려준다. */
export interface AssignmentsReadResponse {
  assignments: AssignmentReadRow[];
}
