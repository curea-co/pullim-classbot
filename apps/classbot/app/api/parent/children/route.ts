/**
 * 학부모 — 내 자녀와 자녀의 수업방·과제 (계약 §4 「학부모」).
 *
 * 자녀 목록은 `parent_child_links` 가 권위다. 그 링크에 없는 학생은 어떤 경로로도
 * 조회되지 않는다 — 학부모가 남의 아이 자료를 볼 수 있는 구멍이 여기서 닫힌다.
 *
 * 자녀의 수업방·과제는 학생 본인 화면과 **같은 함수**로 읽는다
 * (`app/api/_lib/student-views.ts`) — 두 화면이 다른 답을 하면 안 된다.
 *
 * ## 내용은 **자녀 동의 뒤**에 있다 (`class_assignment_summary`)
 *
 * 예전에는 링크만 있으면 반·과제가 무조건 보였다 — 그 인가를 교사·기관 승인의 파생으로
 * 봤기 때문이다. 그런데 스펙은 학부모 전달을 「학생 승인 후」로 두고(`04-ux-flow.md:154`),
 * 같은 화면의 자기주도 칸은 이미 학생 동의 뒤에 있었다. 한 화면 안에서 인가 모델이 둘이면
 * 다음 사람이 새 칸을 어느 쪽에 붙일지 알 수 없으므로, **양쪽을 같은 게이트 뒤로** 옮겼다.
 *
 * ## 이름은 주고 내용은 안 준다 — 그리고 미동의는 「반이 없음」과 같아 보인다
 *
 * 자녀 **목록 자체**(이름·관계)는 동의로 가리지 않는다. 부모가 자기 아이를 아는 것은 링크가
 * 이미 말하는 사실이고, 목록을 가리면 「이어진 자녀가 아예 없다」와 구분이 사라져 학부모
 * 화면이 어느 쪽인지 말할 수 없게 된다(자기주도 화면이 그 둘을 가르는 근거로 이 목록을 쓴다).
 *
 * 대신 **미동의 자녀의 반·과제는 애초에 읽지 않고** 빈 배열로 나간다. 그래서 부모 눈에는
 * 「아직 동의 안 함」과 「참여한 반이 없음」이 **같은 모습**이다 — 자기주도 화면이 미동의와
 * 무활동을 못 가르게 한 것과 같은 규칙이다(§3). 읽어 놓고 안 보내는 것과 읽지 않는 것은
 * 다르다: 로그·에러·타이밍 어디로도 새지 않는다.
 *
 * 역할 판정은 도메인 `users.role` 을 본다. 공유 JWT 타입에는 아직 `parent` 가 없어서
 * claim 만으로는 학부모를 알아볼 수 없다(`app/api/_lib/guards.ts` 주석 참조).
 */

import { NextResponse } from 'next/server';
import { and, asc, eq, inArray } from 'drizzle-orm';

import { getDb } from '@/lib/db';
import { consentLogs, parentChildLinks, users } from '@/lib/db/schema';
import { livingConsent } from '@/app/api/_lib/consent';
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

  // 살아 있는 동의를 준 자녀만 — **이 보호자에게** 준 것으로 좁힌다(다른 보호자에게 준
  // 동의가 이쪽 화면을 열면 학생이 고른 상대가 아닌 사람에게 나간다).
  const consented = links.length
    ? await getDb()
        .select({ studentId: consentLogs.studentId })
        .from(consentLogs)
        .where(
          and(
            eq(consentLogs.parentId, actor.id),
            inArray(
              consentLogs.studentId,
              links.map((l) => l.id),
            ),
            eq(consentLogs.type, 'class_assignment_summary'),
            livingConsent(),
          ),
        )
    : [];
  const sharedBy = new Set(consented.map((row) => row.studentId));

  const children: ParentChildItem[] = await Promise.all(
    links.map(async (child) => {
      // 동의가 없으면 읽지 않는다 — 빈 배열은 「참여한 반이 없음」과 같은 모습이다.
      const [classrooms, assignments] = sharedBy.has(child.id)
        ? await Promise.all([
            listStudentClassrooms(child.id),
            listVisibleAssignments(child.id),
          ])
        : [[], []];
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
