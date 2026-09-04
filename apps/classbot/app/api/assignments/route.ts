/**
 * 읽기 API — 내게 배정된 과제 (학생 시점). plan Phase 7 Stage 1.
 *
 * 목적: 도메인 읽기의 mock 폴백 제거 → **인증 + 실DB**.
 *  - 인증 필수: 세션 없으면 **401** (D1 로그인월 — 익명 mock 통과 없음).
 *  - 명의(studentId)는 JWT claim(sub)에서만 결정(위조 방지).
 *  - assignments 를 본인 명의로 필터해 반환(신원 격리).
 *
 * 문항(assignment_questions) 등 상세는 Stage 2 `/api/assignments/[id]` 범위.
 */

import { NextResponse } from 'next/server';
import { desc, eq } from 'drizzle-orm';

import { getDb } from '@/lib/db';
import { assignments } from '@/lib/db/schema';
import { getCurrentUserIdFromRequest } from '@/lib/current-user';
import { denyUnlessRole } from '@/app/api/_lib/guards';

export const runtime = 'nodejs';

/**
 * 내게 배정된 과제 목록을 본인 명의로 조회한다(학생 시점).
 *
 * 스펙 § 4.5 는 이 경로를 `?audience=student|teacher` 공용 표면으로 두었다. 교사 시점의
 * 몸통(출제한 과제 조회)은 `dev` 에도 없고 이 PR 도 만들지 않는다 — 교사 목록 PR 의 몫이다.
 * 여기서 하는 일은 **학부모·admin 을 막는 것**뿐이고, 학생·교사의 응답은 `dev` 그대로다.
 * @param req - Authorization: Bearer access
 * @returns 200 { assignments: [...] } | 401 | 403
 */
export async function GET(req: Request): Promise<NextResponse> {
  const actor = getCurrentUserIdFromRequest(req);
  const studentId = actor.id;

  // 읽기 가드 — D1 로그인월. 미로그인은 401(mock 폴백 없음).
  // 이 경로는 학생·교사가 시점(`?audience=`)으로 나눠 쓰는 공용 목록이다(스펙 § 4.5).
  // 그래서 **역할을 학생으로 좁히지 않는다** — 좁히면 계약에 있는 교사 시점이 닫힌다.
  // 이 PR 이 막는 것은 개발용 신원 쿠키가 새로 데려온 역할뿐이다: 학부모·admin 은
  // 어느 시점의 주인도 아니라 403 이고, 학생·교사가 받던 응답은 `dev` 그대로다.
  //
  // 시점 파라미터는 **읽지 않는다.** 교사 시점의 몸통(출제한 과제 목록)이 아직 없어서인데,
  // 그건 `dev` 도 마찬가지다 — 이 PR 이 만든 자리가 아니라 교사 목록 PR 이 채울 자리다.
  const denied = denyUnlessRole(actor, ['student', 'teacher'], '학생·교사만 쓸 수 있는 기능입니다.');
  if (denied) return denied;

  const rows = await getDb()
    .select()
    .from(assignments)
    .where(eq(assignments.studentId, studentId))
    .orderBy(desc(assignments.id));

  return NextResponse.json({ assignments: rows });
}
