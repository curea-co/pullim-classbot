/**
 * 반 참여 학생 명단 — `GET /api/teacher/classrooms/[id]/students` (계약 §4).
 *
 * 경로의 반 id 는 클라이언트 입력이라 **소유권을 조회 조건에 넣는다**. 확인 전에 참여 행을
 * 먼저 읽으면 남의 반 명단이 그대로 새 나가고, 403 으로 답하면 그 반이 존재한다는 사실이
 * 새 나간다 — 그래서 남의 반도 없는 반도 똑같이 **404** 다.
 */

import { NextResponse } from 'next/server';
import { asc, eq } from 'drizzle-orm';

import { getDb } from '@/lib/db';
import { enrollments, users } from '@/lib/db/schema';
import {
  forbidden,
  notFound,
  resolveActor,
  unauthorized,
} from '@/app/api/_lib/guards';
import { loadOwnedClassroom } from '@/app/api/_lib/classroom-pair';
import type { ClassroomStudentItem } from '@/app/api/_lib/contract-types';

export const runtime = 'nodejs';

/**
 * 이 반에 참여한 학생 명단.
 * @param req - 신원(쿠키 또는 Bearer)
 * @param ctx - 동적 세그먼트 `{ id }` = 반 id
 * @returns 200 { students } | 401 | 403(역할) | 404
 */
export async function GET(
  req: Request,
  ctx: { params: Promise<{ id: string }> },
): Promise<NextResponse> {
  const actor = await resolveActor(req);
  if (!actor.isIdentified) return unauthorized();
  if (actor.role !== 'teacher') return forbidden('선생님만 볼 수 있어요.');

  const { id: classroomId } = await ctx.params;

  // 내 반이 아니면(없거나 남의 것이거나) 똑같이 404 — 어느 쪽인지 알려 주지 않는다.
  const owned = await loadOwnedClassroom(classroomId, actor.id);
  if (!owned) return notFound('수업방을 찾을 수 없어요.');

  const rows = await getDb()
    .select({
      id: users.id,
      name: users.name,
      joinedAt: enrollments.assignedAt,
    })
    .from(enrollments)
    .innerJoin(users, eq(enrollments.studentId, users.id))
    .where(eq(enrollments.classroomId, classroomId))
    .orderBy(asc(enrollments.assignedAt), asc(users.id));

  const students: ClassroomStudentItem[] = rows.map((r) => ({
    id: r.id,
    name: r.name,
    joinedAt: r.joinedAt.toISOString(),
  }));

  return NextResponse.json({ students });
}
