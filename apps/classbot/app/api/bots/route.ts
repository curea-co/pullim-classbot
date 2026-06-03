/**
 * 읽기 API — 내가 수강(enrolled) 중인 클래스봇 (학생 시점). plan Phase 7 Stage 1.
 *
 * 목적: 도메인 읽기의 mock 폴백을 제거하고 **인증 + 실DB** 로 전환하는 정본 패턴.
 *  - 인증 필수: 세션(Authorization: Bearer access)이 없으면 **401**.
 *    (D1 로그인월 — 익명 mock 통과 없음. 데모는 시드 계정으로 로그인해 읽는다.)
 *  - 명의(studentId)는 클라이언트 입력이 아니라 **JWT claim(sub)** 에서만 결정한다.
 *  - enrollments 를 본인 명의로 필터해 등록된 class_bots 만 반환한다(신원 격리).
 *
 * 응답은 봇 카드 렌더에 필요한 도메인 필드 + enrollment 메타(반/배정자)를 합친다.
 */

import { NextResponse } from 'next/server';
import { eq } from 'drizzle-orm';

import { getDb } from '@/lib/db';
import { classBots, enrollments } from '@/lib/db/schema';
import { getCurrentUserIdFromRequest } from '@/lib/current-user';

// node:crypto / pg(JWT 검증·DB) 사용 — Edge 가 아닌 Node 런타임 강제.
export const runtime = 'nodejs';

/**
 * 내가 수강 중인 봇 목록을 본인 명의로 조회한다.
 * @param req - Authorization: Bearer access
 * @returns 200 { bots: [...] } | 401
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

  // enrollments(본인) ⋈ class_bots — 등록된 봇만, 본인 명의로 격리.
  const rows = await getDb()
    .select({
      id: classBots.id,
      name: classBots.name,
      avatarEmoji: classBots.avatarEmoji,
      teacherName: classBots.teacherName,
      organization: classBots.organization,
      subject: classBots.subject,
      grade: classBots.grade,
      tone: classBots.tone,
      greeting: classBots.greeting,
      scope: classBots.scope,
      isLive: classBots.isLive,
      currentLesson: classBots.currentLesson,
      quickPrompts: classBots.quickPrompts,
      enrolledCount: classBots.enrolledCount,
      classroomId: enrollments.classroomId,
      classroomLabel: enrollments.classroomLabel,
      assignedBy: enrollments.assignedBy,
      via: enrollments.via,
    })
    .from(enrollments)
    .innerJoin(classBots, eq(enrollments.botId, classBots.id))
    .where(eq(enrollments.studentId, studentId));

  return NextResponse.json({ bots: rows });
}
