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
 * 스펙 § 4.2 는 이 경로를 `?role=student|teacher` 공용 표면으로 두었으나, **구현된 것은
 * 학생 시점뿐이다.** 교사 시점(owned 봇)이 비어 있는 이유와 그것을 채우려면 무엇을 먼저
 * 정해야 하는지는 아래 가드 옆 주석에 적혀 있다.
 * @param req - Authorization: Bearer access
 * @returns 200 { bots: [...] } | 401 | 403
 */
export async function GET(req: Request): Promise<NextResponse> {
  const actor = getCurrentUserIdFromRequest(req);
  const studentId = actor.id;

  // 읽기 가드 — D1 로그인월. 신원이 없으면 401(mock 폴백 없음).
  //
  // 이 경로는 학생·교사가 시점(`?role=student|teacher`)으로 나눠 쓰는 **공용 표면**이다
  // (`proc/spec/2026-05-18_be-api-design.md` § 4.2 — 학생은 enrollment, 교사는 owned 봇).
  // 그래서 역할을 학생으로 좁히지 않는다 — 좁히면 계약에 있는 교사 시점이 닫힌다.
  //
  // 여기서 하는 일은 **학부모·admin 을 막는 것뿐이다.** 개발용 신원 폴백
  // (`lib/dev-identity.ts`)이 신원의 role 을 셋으로 넓히면서 학부모가 학생 자료 표면까지
  // 들어오게 된 것을 되막는다. 학생·교사가 받는 응답은 이 가드 앞뒤로 달라지지 않는다.
  //
  // ── 교사 시점이 비어 있는 것은 고장이 아니라 결정이다 ──────────────────────
  // 아래 조회는 시점과 무관하게 enrollment 만 타므로, 교사는 owned 봇이 아닌 결과를 받는다.
  // 이건 이 가드가 만든 것이 아니라 **이 라우트가 처음부터 학생 시점만 구현한** 결과다.
  // 채우려면 `class_bots.teacher_id` 기준 조회를 따로 세우고 **응답 shape 도 새로 정해야**
  // 한다 — owned 봇에는 enrollment 메타(반·배정자·via)가 없어 지금 shape 을 못 쓴다.
  // 표면의 계약을 바꾸는 일이라 **교사 봇 목록 화면 PR** 의 몫이다(「한 PR = 한 단위」).
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
