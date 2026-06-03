/**
 * 읽기 API — 내 웰빙 (학생 시점). plan Phase 7 Stage 1.
 *
 * 목적: 도메인 읽기의 mock 폴백 제거 → **인증 + 실DB**.
 *  - 인증 필수: 세션 없으면 **401** (D1 로그인월).
 *  - 명의(studentId)는 JWT claim(sub)에서만 결정 — 본인 웰빙만 조회(민감정보 격리).
 *  - wellbeing_snapshots(점수 추이) + 최근 emotion_checkins(감정 체크인)를 합쳐 반환.
 *
 * NOTE: 웰빙은 민감정보다. 본인 외(교사/보호자) 조회는 동의 스코프 게이트가 필요하며
 * 그 교차열람 라우트는 Stage 2(`/api/teacher/students/[id]/wellness`) 범위다. 여기서는
 * 본인 self-read 만 허용한다.
 */

import { NextResponse } from 'next/server';
import { desc, eq } from 'drizzle-orm';

import { getDb } from '@/lib/db';
import { emotionCheckIns, wellbeingSnapshots } from '@/lib/db/schema';
import { getCurrentUserIdFromRequest } from '@/lib/current-user';

export const runtime = 'nodejs';

/** 감정 체크인은 최근 N개만 반환(시계열 위젯용). */
const RECENT_CHECKIN_LIMIT = 30;

/**
 * 내 웰빙(점수 스냅샷 + 최근 감정 체크인)을 본인 명의로 조회한다.
 * @param req - Authorization: Bearer access
 * @returns 200 { snapshots: [...], checkIns: [...] } | 401
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

  const db = getDb();

  const [snapshots, checkIns] = await Promise.all([
    db
      .select()
      .from(wellbeingSnapshots)
      .where(eq(wellbeingSnapshots.studentId, studentId))
      .orderBy(desc(wellbeingSnapshots.date)),
    db
      .select()
      .from(emotionCheckIns)
      .where(eq(emotionCheckIns.studentId, studentId))
      .orderBy(desc(emotionCheckIns.date))
      .limit(RECENT_CHECKIN_LIMIT),
  ]);

  return NextResponse.json({ snapshots, checkIns });
}
