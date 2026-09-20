import { isScopeLevel, type Assignment } from '@/lib/mock';
import type { AssignmentReadRow } from '@/hooks/api/read/types';

/**
 * 서버 행(`AssignmentReadRow`) → 화면 `Assignment`.
 *
 * 학생 홈(`components/classbot/home/{learning-hero,todo-panel}.tsx`)이 mock 시절의 `Assignment` 모양을 읽는다 —
 * 그 둘을 정본 행으로 바꾸기 전까지 이 한 줄이 다리다. 종전의 역방향(`assignmentToReadRow` · 로컬 스토어 →
 * 화면 행)은 데모 폴백과 함께 PR 6 에서 걷었다(2026-09-16 계획 §06 R7·R8).
 *
 * @param row - 서버가 준 과제 한 행
 * @returns 홈이 읽는 Assignment
 */
export function readRowToAssignment(row: AssignmentReadRow): Assignment {
  const {
    assignedAtLabel, scopeOverride, recentAccuracy, reasonHint, studentId,
    submitted, submittedAt, scorePercent,
    ...rest
  } = row;
  void studentId; // 서버 행의 대상 표기 — 학생은 「내 과제」만 받으므로 쓰지 않는다.
  // 본인 제출 세 칸(pullim-api #681)은 **`Assignment` 에 없는 칸**이라 떨어뜨린다. 남겨 두면 `Assignment`
  // 라고 적힌 객체가 선언에 없는 칸을 몰래 들고 다닌다(스프레드라 타입이 막아 주지 않는다).
  // 홈이 읽는 것은 `completedCount` 까지다 — 그 값이 이미 「냈나」의 투영이라 판정에 필요한 것은 넘어간다.
  // 「냈는지」를 직접 물어야 하는 화면이 생기면 `Assignment` 를 넓히는 대신 그 화면이 행을 그대로 읽는다.
  void submitted;
  void submittedAt;
  void scorePercent;
  return {
    ...rest,
    assignedAt: assignedAtLabel,
    // 서버 컬럼은 number 라 좁혀 준다. 범위 밖 값은 「지정 없음」으로 본다 —
    // 잘못된 값으로 시험 모드의 범위 축소를 흉내 내는 것보다 낫다.
    scopeOverride: isScopeLevel(scopeOverride) ? scopeOverride : undefined,
    recentAccuracy: recentAccuracy ?? undefined,
    reasonHint: reasonHint ?? undefined,
  };
}
