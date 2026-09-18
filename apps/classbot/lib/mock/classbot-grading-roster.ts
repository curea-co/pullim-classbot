/**
 * 채점 항목 목 — 남은 소비처는 **학생 상세 하나**다.
 *
 * ⚠ 이 모듈은 이름대로 「채점 허브가 읽는 등록 학생 × 채점 항목」이었고, 채점 허브가 목을 걷으면서
 * (2026-09-18) **함께 지울 예정이었다.** 지우지 못한 까닭 하나 —
 * `app/(teacher)/teacher/students/[id]/page.tsx` 가 `gradingItemsOfStudent()` 를 읽는다.
 * 그 트리(학생 목록·상세·리플레이·관제소)를 걷는 **뒤 PR 이 이 파일을 함께 지운다.**
 * 그때까지 남는 것은 아래 둘뿐이고, **새로 읽지 마라.**
 *
 * 같은 날 함께 걷은 셋(채점 허브 말고는 쓰는 곳이 없었다):
 *  - `buildGradingRoster()` · `GradingRosterRow` — 등록 학생 전체를 한 줄씩 만들어 대기·검토중·완료를
 *    세던 것. 소비처는 채점 허브 학생 탭(`grading-student-list.tsx`)과 그 거르개뿐이었다.
 *  - `studentHrefOfGrading()` — 채점 상세에서 학생 상세로 건너가는 링크. 채점 상세가 사라졌다.
 *
 * 남은 둘이 지키던 사실(「채점 시드가 학생 명단과 같은 모집단이다」)은
 * `__tests__/classbot-grading-roster.test.ts` 가 그대로 지킨다 — 학생 상세가 이 값을 읽는 동안에는
 * 채점 항목의 `studentId`·`studentName` 이 명단과 어긋나면 안 되기 때문이다.
 */

import { gradingQueue, overriddenSample, type GradingItem } from './classbot';

/** 채점 항목 전체 — 큐 시드 6건 + overridden 시연 1건. */
export const allGradingItems: GradingItem[] = [...gradingQueue, overriddenSample];

/** 한 학생 앞으로 온 채점 항목 — 학생 상세가 읽는다. */
export function gradingItemsOfStudent(
  studentId: string,
  items: GradingItem[] = allGradingItems,
): GradingItem[] {
  return items.filter(item => item.studentId === studentId);
}
