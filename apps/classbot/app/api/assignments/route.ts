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

export const runtime = 'nodejs';

/**
 * 내게 보여야 할 과제 목록 — 개인 배정 + 반 단위 발사.
 * @param req - Authorization: Bearer access 또는 dev 신원 쿠키
 * @returns 200 { assignments: [...] } | 401
 */
export async function GET(req: Request): Promise<NextResponse> {
  const { id: studentId, isIdentified } = getCurrentUserIdFromRequest(req);

  // 읽기 가드 — D1 로그인월. 미로그인은 401(mock 폴백 없음).
  if (!isIdentified) {
    return NextResponse.json(
      { message: '로그인이 필요합니다.', code: 'AUTH_REQUIRED' },
      { status: 401 },
    );
  }

  const rows = await getDb()
    .select()
    .from(assignments)
    .where(visibleAssignmentsWhere(studentId))
    // id 는 uuid 라 시간순이 아니다 — 발사 시각을 먼저 본다.
    .orderBy(desc(assignments.dispatchedAt), desc(assignments.id));

  return NextResponse.json({ assignments: rows });
}
