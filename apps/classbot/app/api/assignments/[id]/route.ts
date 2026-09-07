/**
 * 읽기 API — 내 과제 단건 (학생 시점). plan Phase 7 Stage 2.
 *
 * 목적: 상세면(`/classbot/assignment/[id]`)이 목록과 **같은 실DB 소스**를 보게 한다.
 *  목록만 실DB(`/api/assignments`)로 전환하고 상세는 mock store 를 보던 split-brain
 *  (목록의 실DB 과제를 클릭하면 상세에서 404)을 제거한다.
 *
 *  - 미인증: **401** (D1 로그인월 — mock 폴백 없음).
 *  - 명의(studentId)는 JWT claim(sub)에서만 결정(위조 방지).
 *  - 본인 명의 + id 일치 행이 없으면 **404**(타인 과제 존재 노출 차단 포함).
 *
 * 문항(assignment_questions)·풀이 진행(solve/submit) 상태는 더 깊은 레이어로
 * 이 읽기 슬라이스 범위 밖이다(문항은 여전히 mock, 진행 상태는 store).
 */

import { NextResponse } from 'next/server';
import { and, eq } from 'drizzle-orm';

import { getDb } from '@/lib/db';
import { assignments } from '@/lib/db/schema';
import { getCurrentUserIdFromRequest } from '@/lib/current-user';
import { denyUnlessStudent } from '@/app/api/_lib/guards';

export const runtime = 'nodejs';

/**
 * 내 과제 단건을 본인 명의로 조회한다.
 * @param req - Authorization: Bearer access
 * @param ctx - 동적 세그먼트 `{ id }`
 * @returns 200 { assignment } | 401 | 403 | 404
 */
export async function GET(
  req: Request,
  ctx: { params: Promise<{ id: string }> },
): Promise<NextResponse> {
  const actor = getCurrentUserIdFromRequest(req);
  const studentId = actor.id;

  // 읽기 가드 — D1 로그인월. 미로그인은 401(mock 폴백 없음).
  // 학생 **본인** 표면이라 신원만으로는 모자라고 역할도 함께 본다. 개발용 학부모·교사
  // 신원이 여기로 들어와 빈 목록 200 을 받으면 「자료가 없다」와 「그 역할은 볼 수 없다」가
  // 뒤섞인다 — 후자는 403 으로 말한다 (`app/api/_lib/guards.ts`).
  const denied = denyUnlessStudent(actor);
  if (denied) return denied;

  const { id } = await ctx.params;

  // 본인 명의(studentId)로만 단건 조회 — 타인 과제는 조회 자체가 0행 → 404.
  const [row] = await getDb()
    .select()
    .from(assignments)
    .where(and(eq(assignments.id, id), eq(assignments.studentId, studentId)))
    .limit(1);

  if (!row) {
    return NextResponse.json(
      { message: '과제를 찾을 수 없습니다.', code: 'NOT_FOUND' },
      { status: 404 },
    );
  }

  return NextResponse.json({ assignment: row });
}
