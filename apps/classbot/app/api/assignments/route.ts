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
import { gateAudience } from '@/app/api/_lib/guards';

export const runtime = 'nodejs';

/**
 * 내게 배정된 과제 목록을 본인 명의로 조회한다(학생 시점).
 *
 * 스펙 § 4.5 는 이 경로를 `?audience=student|teacher` 공용 표면으로 두었다. 가드는 그
 * 계약을 지우지 않고 **시점의 주인인지**만 본다 — 교사 시점의 몸통(출제한 과제 목록)은
 * 교사 화면 PR 의 몫이고, 이 PR 은 그 응답을 바꾸지 않는다.
 * @param req - Authorization: Bearer access (+ `?audience=student|teacher`, 생략 시 student)
 * @returns 200 { assignments: [...] } | 400 | 401 | 403
 */
export async function GET(req: Request): Promise<NextResponse> {
  const actor = getCurrentUserIdFromRequest(req);
  const studentId = actor.id;

  // 읽기 가드 — D1 로그인월. 미로그인은 401(mock 폴백 없음).
  // 이 경로는 학생·교사가 **시점(`?audience=`)으로 나눠 쓰는 공용 목록**이라(스펙 § 4.5),
  // 역할을 학생으로 못박지 않고 **요청한 시점의 주인인지**를 본다. 학부모·admin 은
  // 어느 시점의 주인도 아니라 403 이다 (`app/api/_lib/guards.ts`).
  // 교사 시점의 응답 자체는 이 PR 이 바꾸지 않는다 — 그 몸통(출제한 과제 목록)은 아직
  // 이 라우트에 없고, 만드는 건 교사 화면 PR 의 몫이다. 여기서 닫지 않고 종전 그대로 통과시킨다.
  const gate = gateAudience(req, 'audience', actor);
  if (gate.deny) return gate.deny;

  const rows = await getDb()
    .select()
    .from(assignments)
    .where(eq(assignments.studentId, studentId))
    .orderBy(desc(assignments.id));

  return NextResponse.json({ assignments: rows });
}
