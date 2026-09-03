/**
 * 읽기 API — 내게 배정된 과제 (학생 시점). plan Phase 7 Stage 1.
 *
 * 목적: 도메인 읽기의 mock 폴백 제거 → **인증 + 실DB**.
 *  - 인증 필수: 세션 없으면 **401** (D1 로그인월 — 익명 mock 통과 없음).
 *  - 명의(studentId)는 신원 해석기에서만 결정(위조 방지).
 *  - assignments 를 본인 명의로 필터해 반환(신원 격리).
 *
 * **반 단위 발사도 함께 본다.** 교사가 반 전체에 쏜 과제는 학생 1인 행을 만들지 않으므로
 * `student_id = 나` 한 줄로는 학생 화면에 영영 안 나온다. 넓힌 술어는
 * `app/api/_lib/assignment-visibility.ts` 가 소유한다.
 *
 * 문항(assignment_questions) 등 상세는 Stage 2 `/api/assignments/[id]` 범위.
 */

import { NextResponse } from 'next/server';
import { desc } from 'drizzle-orm';

import { getDb } from '@/lib/db';
import { assignments } from '@/lib/db/schema';
import { getCurrentUserIdFromRequest } from '@/lib/current-user';
import { visibleAssignmentsWhere } from '@/app/api/_lib/assignment-visibility';
import { denyUnlessRole } from '@/app/api/_lib/guards';

export const runtime = 'nodejs';

/**
 * 내게 보여야 할 과제 목록 — 개인 배정 + 반 단위 발사(학생 시점).
 *
 * 스펙 § 4.5 는 이 경로를 `?audience=student|teacher` 공용 표면으로 두었으나, **구현된 것은
 * 학생 시점뿐이다.** 교사 시점(출제한 과제)이 비어 있는 이유와 그것을 채우려면 무엇을 먼저
 * 정해야 하는지는 아래 가드 옆 주석에 적혀 있다.
 * @param req - Authorization: Bearer access 또는 개발용 신원 쿠키
 * @returns 200 { assignments: [...] } | 401 | 403
 */
export async function GET(req: Request): Promise<NextResponse> {
  const actor = getCurrentUserIdFromRequest(req);
  const studentId = actor.id;

  // 읽기 가드 — D1 로그인월. 신원이 없으면 401(mock 폴백 없음).
  //
  // 이 경로는 학생·교사가 시점(`?audience=student|teacher`)으로 나눠 쓰는 **공용 표면**이다
  // (`proc/spec/2026-05-18_be-api-design.md` § 4.5). 그래서 역할을 학생으로 좁히지 않는다 —
  // 좁히면 계약에 있는 교사 시점이 닫힌다.
  //
  // 여기서 하는 일은 **학부모·admin 을 막는 것뿐이다.** 개발용 신원 폴백
  // (`lib/dev-identity.ts`)이 신원의 role 을 셋으로 넓히면서 학부모가 학생 자료 표면까지
  // 들어오게 된 것을 되막는다. 학생·교사가 받는 응답은 이 가드 앞뒤로 달라지지 않는다.
  //
  // ── 교사 시점이 비어 있는 것은 고장이 아니라 결정이다 ──────────────────────
  // 아래 조회는 시점과 무관하게 `student_id` 만 타므로, 교사는 「출제한 과제」가 아닌 결과를
  // 받는다. 이건 이 가드가 만든 것이 아니라 **이 라우트가 처음부터 학생 시점만 구현한** 결과다.
  // 채우려면 먼저 **소유 축을 정해야 한다** — `assignments` 에는 교사를 가리키는 키가 없다.
  // `created_by` 같은 컬럼이 없고, `assigned_by` 는 users 참조가 아니라 표시용 text 다.
  // 남은 길은 `assignments ⋈ class_bots.teacher_id` 조인이거나 컬럼 추가인데 **둘 다 스키마
  // 설계 결정**이라 가드 한 줄과 같은 PR 에 담지 않는다(「한 PR = 한 단위」).
  // 그 결정이 날 때까지 이 자리는 의도적으로 비워 둔다.
  const denied = denyUnlessRole(actor, ['student', 'teacher'], '학생·교사만 쓸 수 있는 기능입니다.');
  if (denied) return denied;

  const rows = await getDb()
    .select()
    .from(assignments)
    .where(visibleAssignmentsWhere(studentId))
    // id 는 uuid 라 시간순이 아니다 — 발사 시각을 먼저 본다.
    .orderBy(desc(assignments.dispatchedAt), desc(assignments.id));

  return NextResponse.json({ assignments: rows });
}
