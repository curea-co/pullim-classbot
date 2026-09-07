/**
 * 학부모 시점 읽기 조각 — `GET /api/parent/children` 이 쓴다.
 *
 * **지금 이 파일의 매퍼는 라우트에서 호출되지 않는다.** 반·과제 내용은
 * `class_assignment_summary` 동의 게이트가 생기기 전까지 나가지 않기 때문이다
 * (라우트 머리주석 참조 · 인도자는 **#271**). 그런데도 매퍼를 지우지 않고 여기 두는 이유:
 *
 * 이 함수가 담고 있는 것은 「어떤 칸이 학부모에게 나가도 되는가」라는 **인가 판단**이지
 * 단순 변환이 아니다. 지워 두면 #271 이 동의 조회를 얹을 때 그 판단을 처음부터 다시 해야
 * 하고, 그때 가장 쉬운 길은 `{ ...row }` 전개다 — 바로 이 PR 이 막은 그 구멍이다.
 * 그래서 **판단은 테스트와 함께 살려 두고**(`app/api/__tests__/parent-views.test.ts`),
 * #271 은 술어만 얹어 이 매퍼를 그대로 호출하면 되게 한다.
 */

import type { assignments } from '@/lib/db/schema';
import type { ParentAssignmentItem } from '@/app/api/_lib/contract-types';

/**
 * 과제 행 → 학부모가 볼 칸. **행을 전개하지 않고 칸을 손으로 옮긴다.**
 *
 * `{ ...row }` 를 쓰면 `assignments` 에 컬럼이 하나 늘 때마다 학부모 응답이 **조용히**
 * 넓어진다. 실제로 그 행에는 정답률(`recentAccuracy`) · 풀이 딥링크(`solveHref`) ·
 * 오답 문항 키(`requizQuestionIds`)가 실려 있고, 반 단위 발사 행에는 **다른 아이들의
 * user id**(`targetStudentIds`)까지 실려 있다. 05 § 11.4 는 이 축이 내보낼 것을
 * 「받은 과제 현황 **(답안·점수 제외)**」으로 못박았다 — 무엇을 왜 뺐는지는 계약 타입
 * (`ParentAssignmentItem`) 주석에 칸별로 적어 두었다.
 *
 * @param row - `assignments` 한 행
 * @returns 학부모에게 나가도 되는 칸만 담은 객체
 */
export function toParentAssignment(
  row: typeof assignments.$inferSelect,
): ParentAssignmentItem {
  return {
    id: row.id,
    botId: row.botId,
    title: row.title,
    subject: row.subject,
    grade: row.grade,
    scope: row.scope,
    mode: row.mode,
    difficulty: row.difficulty,
    questionCount: row.questionCount,
    completedCount: row.completedCount,
    state: row.state,
    assignedBy: row.assignedBy,
    assignedAtLabel: row.assignedAtLabel,
    dueLabel: row.dueLabel,
    dDay: row.dDay,
    // 직렬화 형태를 계약 타입(문자열 시각)에 맞춘다.
    dispatchedAt: row.dispatchedAt ? row.dispatchedAt.toISOString() : null,
  };
}
