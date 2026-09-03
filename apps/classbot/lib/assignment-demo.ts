import type { Assignment, ScopeLevel } from '@/lib/mock';
import type { AssignmentReadRow } from '@/hooks/api/read/types';

/**
 * 데모 폴백 매핑 — Assignment(로컬 스토어/mock) → AssignmentReadRow(API 행 형상).
 *
 * Phase7 이후 받은 과제 목록/상세는 실API(sub-scoped) 단일 신원이지만, BE 세션이 없는
 * 데모(미로그인)에서는 교사 발사분이 로컬 스토어에만 쌓여 목록이 비어 보인다. 미로그인일
 * 때만 이 매핑으로 로컬 과제를 API 렌더 경로에 흘려보내 발사→수령 흐름을 동작시킨다.
 * 인증 사용자는 실API 경로를 그대로 사용한다(이 매핑 미적용).
 */
export function assignmentToReadRow(a: Assignment): AssignmentReadRow {
  const { assignedAt, scopeOverride, recentAccuracy, reasonHint, ...rest } = a;
  return {
    ...rest,
    studentId: null,
    assignedAtLabel: assignedAt,
    scopeOverride: scopeOverride ?? null,
    recentAccuracy: recentAccuracy ?? null,
    reasonHint: reasonHint ?? null,
  };
}

/**
 * 역방향 매핑 — AssignmentReadRow(서버 행) → Assignment(풀이 화면이 읽는 모양).
 *
 * 교사 발사가 서버로 가기 시작하면서(계약 §2·§4) 학생에게 오는 과제의 **정본이 서버 행**이
 * 됐다. 목록·상세·대화·결과는 이미 서버 행을 그대로 읽는데 **풀이 화면만** 로컬 스토어에서
 * 찾고 있어서, 서버에서 온 과제를 누르면 `notFound()` 로 떨어졌다 — 교사는 냈고 학생 목록에도
 * 보이는데 풀 수는 없는 상태였다.
 *
 * ⚠ 문항 **본문**은 여기서 오지 않는다 — 서버 행은 과제 메타뿐이다(M2 경계, `lib/store/assignments.ts`
 * 의 주석 참고). `getQuestionsForAssignment()` 가 mode 시드로 채운다.
 * @param row - 서버가 준 과제 한 행
 * @returns 풀이·문항 해석이 쓰는 Assignment
 */
export function readRowToAssignment(row: AssignmentReadRow): Assignment {
  const { assignedAtLabel, scopeOverride, recentAccuracy, reasonHint, studentId, ...rest } = row;
  void studentId; // 서버 행의 대상 표기 — 풀이 화면은 「내 과제」만 받으므로 쓰지 않는다.
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

/** 1..5 인가 — 서버가 주는 number 를 `ScopeLevel` 로 좁힌다. */
function isScopeLevel(value: number | null): value is ScopeLevel {
  return value === 1 || value === 2 || value === 3 || value === 4 || value === 5;
}
