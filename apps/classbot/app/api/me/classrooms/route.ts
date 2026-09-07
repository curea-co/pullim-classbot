/**
 * 내가 참여한 수업방 목록 — `GET /api/me/classrooms` (계약 §4 「학생」).
 *
 * 질의 본체는 `app/api/_lib/student-views.ts` 가 소유한다 — 학부모가 보는 자녀의
 * 수업방과 **같은 질의**여야 두 화면이 어긋나지 않는다.
 */

import { NextResponse } from 'next/server';

import { denyUnlessStudent, resolveActor } from '@/app/api/_lib/guards';
import { listStudentClassrooms } from '@/app/api/_lib/student-views';

export const runtime = 'nodejs';

/**
 * 내가 참여 중인 수업방을 모두 돌려준다.
 * @param req - 신원(쿠키 또는 Bearer)
 * @returns 200 { classrooms: StudentClassroomItem[] } | 401 | 403
 */
export async function GET(req: Request): Promise<NextResponse> {
  const actor = await resolveActor(req);

  // 「내가 참여한 수업방」은 **학생 개념**이다. 교사는 자기가 연 반을
  // `GET /api/teacher/classrooms` 로 보고, 학부모는 자녀 것을 `GET /api/parent/children`
  // 으로 본다 — 셋은 인가 모델이 서로 다르다(학생=본인, 교사=소유, 학부모=자녀 동의).
  //
  // 신원만 확인하고 역할을 안 보면 교사·학부모 명의도 이 학생용 표면에서 200 을 받는다.
  // 지금은 그들에게 enrollment 행이 없어 빈 목록이 나올 뿐이지만, 그건 **데이터가 우연히
  // 비어 있는 것**이지 가드가 아니다. 개발용 신원 폴백(`lib/dev-identity.ts`)이 역할을
  // 셋으로 넓혀 둔 터라 더욱 그렇다. 역할 경계는 데이터가 아니라 가드가 세운다.
  const denied = denyUnlessStudent(actor);
  if (denied) return denied;

  const items = await listStudentClassrooms(actor.id);
  return NextResponse.json({ classrooms: items });
}
