import type { Assignment } from '@/lib/mock';
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
