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
import { denyUnlessRole } from '@/app/api/_lib/guards';

// node:crypto / pg(JWT 검증·DB) 사용 — Edge 가 아닌 Node 런타임 강제.
export const runtime = 'nodejs';

/**
 * 내가 수강 중인 봇 목록을 본인 명의로 조회한다(학생 시점).
 *
 * 스펙 § 4.2 는 이 경로를 `?role=student|teacher` 공용 표면으로 두었다. 교사 시점의
 * 몸통(owned 봇 조회)은 `dev` 에도 없고 이 PR 도 만들지 않는다 — 교사 목록 PR 의 몫이다.
 * 여기서 하는 일은 **학부모·admin 을 막는 것**뿐이고, 학생·교사의 응답은 `dev` 그대로다.
 * @param req - Authorization: Bearer access
 * @returns 200 { bots: [...] } | 401 | 403
 */
export async function GET(req: Request): Promise<NextResponse> {
  const actor = getCurrentUserIdFromRequest(req);
  const studentId = actor.id;

  // 읽기 가드 — D1 로그인월. 미로그인은 401(mock 폴백 없음).
  // 이 경로는 학생·교사가 시점(`?role=`)으로 나눠 쓰는 공용 목록이다(스펙 § 4.2).
  // 그래서 **역할을 학생으로 좁히지 않는다** — 좁히면 계약에 있는 교사 시점이 닫힌다.
  // 이 PR 이 막는 것은 개발용 신원 쿠키가 새로 데려온 역할뿐이다: 학부모·admin 은
  // 어느 시점의 주인도 아니라 403 이고, 학생·교사가 받던 응답은 `dev` 그대로다.
  //
  // 시점 파라미터는 **읽지 않는다.** 교사 시점의 몸통(owned 봇 목록)이 아직 없어서인데,
  // 그건 `dev` 도 마찬가지다 — 이 PR 이 만든 자리가 아니라 교사 목록 PR 이 채울 자리다.
  const denied = denyUnlessRole(actor, ['student', 'teacher'], '학생·교사만 쓸 수 있는 기능입니다.');
  if (denied) return denied;

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
