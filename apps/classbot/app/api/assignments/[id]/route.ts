/**
 * 읽기 API — 내 과제 단건 (학생 시점). plan Phase 7 Stage 2.
 *
 * 목적: 상세면(`/classbot/assignment/[id]`)이 목록과 **같은 실DB 소스**를 보게 한다.
 *  목록만 실DB(`/api/assignments`)로 전환하고 상세는 mock store 를 보던 split-brain
 *  (목록의 실DB 과제를 클릭하면 상세에서 404)을 제거한다.
 *
 *  - 미인증: **401** (D1 로그인월 — mock 폴백 없음).
 *  - 명의(studentId)는 신원 해석기에서만 결정(위조 방지).
 *  - 내가 볼 수 있는 과제(개인 배정 + 반 단위 발사) 중 id 가 맞는 행이 없으면
 *    **404**(타인 과제 존재 노출 차단 포함). 목록과 **같은 술어**를 쓴다 —
 *    목록에 뜨는데 상세가 404 나는 split-brain 을 막는다.
 *
 * 문항(assignment_questions)·풀이 진행(solve/submit) 상태는 더 깊은 레이어로
 * 이 읽기 슬라이스 범위 밖이다(문항은 여전히 mock, 진행 상태는 store).
 */

import { NextResponse } from 'next/server';
import { and, eq } from 'drizzle-orm';

import { getDb } from '@/lib/db';
import { assignments } from '@/lib/db/schema';
import { getCurrentUserIdFromRequest } from '@/lib/current-user';
import { visibleAssignmentsWhere } from '@/app/api/_lib/assignment-visibility';

export const runtime = 'nodejs';

/**
 * 내 과제 단건을 본인 명의로 조회한다.
 * @param req - Authorization: Bearer access
 * @param ctx - 동적 세그먼트 `{ id }`
 * @returns 200 { assignment } | 401 | 404
 */
export async function GET(
  req: Request,
  ctx: { params: Promise<{ id: string }> },
): Promise<NextResponse> {
  const { id: studentId, isIdentified } = getCurrentUserIdFromRequest(req);

  // 읽기 가드 — D1 로그인월. 미로그인은 401(mock 폴백 없음).
  if (!isIdentified) {
    return NextResponse.json(
      { message: '로그인이 필요합니다.', code: 'AUTH_REQUIRED' },
      { status: 401 },
    );
  }

  const { id } = await ctx.params;

  // 볼 수 있는 과제로만 좁혀 단건 조회 — 남의 과제는 조회 자체가 0행 → 404.
  const [row] = await getDb()
    .select()
    .from(assignments)
    .where(and(eq(assignments.id, id), visibleAssignmentsWhere(studentId, 'student-own')))
    .limit(1);

  if (!row) {
    return NextResponse.json(
      { message: '과제를 찾을 수 없습니다.', code: 'NOT_FOUND' },
      { status: 404 },
    );
  }

  return NextResponse.json({ assignment: row });
}
