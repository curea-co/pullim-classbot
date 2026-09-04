/**
 * 내가 참여한 수업방 목록 — `GET /api/me/classrooms` (계약 §4 「학생」).
 *
 * 질의 본체는 `app/api/_lib/student-views.ts` 가 소유한다 — 학부모가 보는 자녀의
 * 수업방과 **같은 질의**여야 두 화면이 어긋나지 않는다.
 */

import { NextResponse } from 'next/server';

import { resolveActor, unauthorized } from '@/app/api/_lib/guards';
import { listStudentClassrooms } from '@/app/api/_lib/student-views';

export const runtime = 'nodejs';

/**
 * 내가 참여 중인 수업방을 모두 돌려준다.
 * @param req - 신원(쿠키 또는 Bearer)
 * @returns 200 { classrooms: StudentClassroomItem[] } | 401
 */
export async function GET(req: Request): Promise<NextResponse> {
  const actor = await resolveActor(req);
  if (!actor.isIdentified) return unauthorized();

  const items = await listStudentClassrooms(actor.id);
  return NextResponse.json({ classrooms: items });
}
