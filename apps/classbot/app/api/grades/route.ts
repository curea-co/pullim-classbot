/**
 * 읽기 API — 내 채점 이력 (학생 시점). plan Phase 7 Stage 1.
 *
 * 목적: 도메인 읽기의 mock 폴백 제거 → **인증 + 실DB**.
 *  - 인증 필수: 세션 없으면 **401** (D1 로그인월).
 *  - 명의(studentId)는 JWT claim(sub)에서만 결정.
 *  - grading_history 를 본인 명의로 필터해 반환(신원 격리).
 */

import { NextResponse } from 'next/server';
import { desc, eq } from 'drizzle-orm';

import { getDb } from '@/lib/db';
import { gradingHistory } from '@/lib/db/schema';
import { getCurrentUserIdFromRequest } from '@/lib/current-user';
import { denyUnlessStudent } from '@/app/api/_lib/guards';

export const runtime = 'nodejs';

/**
 * 내 채점 이력을 본인 명의로 조회한다.
 * @param req - Authorization: Bearer access
 * @returns 200 { grades: [...] } | 401 | 403
 */
export async function GET(req: Request): Promise<NextResponse> {
  const actor = getCurrentUserIdFromRequest(req);
  const studentId = actor.id;

  // 읽기 가드 — D1 로그인월. 미로그인은 401(mock 폴백 없음).
  // 학생 **본인** 표면이라 신원만으로는 모자라고 역할도 함께 본다. 개발용 학부모·교사
  // 신원이 여기로 들어와 빈 목록 200 을 받으면 「자료가 없다」와 「그 역할은 볼 수 없다」가
  // 뒤섞인다 — 후자는 403 으로 말한다 (`app/api/_lib/guards.ts`).
  const denied = denyUnlessStudent(actor);
  if (denied) return denied;

  const rows = await getDb()
    .select()
    .from(gradingHistory)
    .where(eq(gradingHistory.studentId, studentId))
    .orderBy(desc(gradingHistory.id));

  return NextResponse.json({ grades: rows });
}
