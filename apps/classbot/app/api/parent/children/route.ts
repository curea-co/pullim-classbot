/**
 * 학부모 — 내 자녀와 자녀의 수업방·과제 (계약 §4 「학부모」).
 *
 * 자녀 목록은 `parent_child_links` 가 권위다. 그 링크에 없는 학생은 어떤 경로로도
 * 조회되지 않는다 — 학부모가 남의 아이 자료를 볼 수 있는 구멍이 여기서 닫힌다.
 *
 * 자녀의 수업방·과제는 학생 본인 화면과 **같은 함수**로 읽는다
 * (`app/api/_lib/student-views.ts`) — 두 화면이 다른 답을 하면 안 된다.
 *
 * 역할 판정은 도메인 `users.role` 을 본다. 공유 JWT 타입에는 아직 `parent` 가 없어서
 * claim 만으로는 학부모를 알아볼 수 없다(`app/api/_lib/guards.ts` 주석 참조).
 */

import { NextResponse } from 'next/server';
import { asc, eq } from 'drizzle-orm';

import { getDb } from '@/lib/db';
import { parentChildLinks, users } from '@/lib/db/schema';
import { forbidden, resolveActor, unauthorized } from '@/app/api/_lib/guards';
import {
  listStudentClassrooms,
  listVisibleAssignments,
} from '@/app/api/_lib/student-views';
import type { ParentChildItem } from '@/app/api/_lib/contract-types';

export const runtime = 'nodejs';

/**
 * 내 자녀 목록 + 각 자녀의 수업방·과제.
 * @param req - 신원(쿠키 또는 Bearer)
 * @returns 200 { children } | 401 | 403
 */
export async function GET(req: Request): Promise<NextResponse> {
  const actor = await resolveActor(req);
  if (!actor.isIdentified) return unauthorized();
  if (actor.role !== 'parent') return forbidden('보호자만 볼 수 있어요.');

  const links = await getDb()
    .select({
      id: users.id,
      name: users.name,
      relation: parentChildLinks.relation,
    })
    .from(parentChildLinks)
    .innerJoin(users, eq(parentChildLinks.studentId, users.id))
    .where(eq(parentChildLinks.parentId, actor.id))
    .orderBy(asc(users.name));

  const children: ParentChildItem[] = await Promise.all(
    links.map(async (child) => {
      const [classrooms, assignments] = await Promise.all([
        listStudentClassrooms(child.id),
        listVisibleAssignments(child.id),
      ]);
      return {
        id: child.id,
        name: child.name,
        relation: child.relation,
        classrooms,
        // 직렬화 형태를 계약 타입(문자열 시각)에 맞춘다.
        assignments: assignments.map((a) => ({
          ...a,
          dispatchedAt: a.dispatchedAt ? a.dispatchedAt.toISOString() : null,
        })),
      };
    }),
  );

  return NextResponse.json({ children });
}
