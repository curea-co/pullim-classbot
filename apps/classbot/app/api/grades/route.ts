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

export const runtime = 'nodejs';

/**
 * 내 채점 이력을 본인 명의로 조회한다.
 * @param req - Authorization: Bearer access
 * @returns 200 { grades: [...] } | 401
 */
export async function GET(req: Request): Promise<NextResponse> {
  const { id: studentId, isAuthenticated } = getCurrentUserIdFromRequest(req);

  // 읽기 가드 — D1 로그인월. 미로그인은 401(mock 폴백 없음).
  if (!isAuthenticated) {
    return NextResponse.json(
      { message: '로그인이 필요합니다.', code: 'AUTH_REQUIRED' },
      { status: 401 },
    );
  }

  const rows = await getDb()
    .select()
    .from(gradingHistory)
    .where(eq(gradingHistory.studentId, studentId))
    .orderBy(desc(gradingHistory.id));

  return NextResponse.json({ grades: rows });
}
