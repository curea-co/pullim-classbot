/**
 * 학부모 — 내 자녀와 자녀의 수업방·과제 (계약 §4 「학부모」).
 *
 * 자녀 목록은 `parent_child_links` 가 권위다. 그 링크에 없는 학생은 어떤 경로로도
 * 조회되지 않는다 — 학부모가 남의 아이 자료를 볼 수 있는 구멍이 여기서 닫힌다.
 *
 * 역할 판정은 도메인 `users.role` 을 본다. 공유 JWT 타입에는 아직 `parent` 가 없어서
 * claim 만으로는 학부모를 알아볼 수 없다(`app/api/_lib/guards.ts` 주석 참조).
 *
 * ## 링크만으로는 열리지 않는다 — 학생의 **살아 있는 동의**가 있어야 한다
 *
 * [05 § 11.4](../../../../../proc/spec/05-business-rules.md) 는 학부모의 「반·과제 현황」을
 * 학생의 `class_assignment_summary` 동의 뒤에 뒀다. 그 술어(`livingConsent`)는 **조회
 * 조건 안**에 들어간다 — 규칙 1: 미동의 자녀의 데이터는 **애초에 읽지 않는다.** 읽어 놓고
 * 안 보내는 것과 다르다.
 *
 * 동의는 **이 보호자에게 준 것**으로 좁힌다. 다른 보호자에게 준 동의로 이 화면이 열리면
 * 학생이 고른 상대가 아닌 사람에게 자료가 나간다.
 *
 * 과제는 `class-summary` 축으로만 읽는다 — 자기주도로 스스로 담은 봇의 과제는 다른 동의
 * 축이라 이 목록에 섞이면 안 된다(`app/api/_lib/assignment-visibility.ts`).
 *
 * **자녀 목록(이름·관계)은 가리지 않는다.** § 11.4 규칙 2 의 단서 그대로다 — 가리면
 * 「이어진 자녀가 아예 없다」와 구분이 사라진다. 반대로 내용이 빈 배열인 것은 부모 눈에
 * 「참여한 반이 없다」와 **같은 모습**이라, 규칙 2 가 요구하는 「미동의와 무활동을 구별할 수
 * 없게」를 만족한다.
 */

import { NextResponse } from 'next/server';
import { and, asc, eq, inArray } from 'drizzle-orm';

import { getDb } from '@/lib/db';
import { consentLogs, parentChildLinks, users } from '@/lib/db/schema';
import { forbidden, resolveActor, unauthorized } from '@/app/api/_lib/guards';
import { CLASS_ASSIGNMENT_CONSENT, livingConsent } from '@/app/api/_lib/consent';
import { toParentAssignment } from '@/app/api/_lib/parent-views';
import {
  listStudentClassrooms,
  listVisibleAssignments,
} from '@/app/api/_lib/student-views';
import type { ParentChildItem } from '@/app/api/_lib/contract-types';

export const runtime = 'nodejs';

/**
 * 내 자녀 목록 + 동의를 준 자녀의 수업방·과제.
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

  // 링크가 없으면 동의를 물을 자녀도 없다 — `inArray` 에 빈 배열을 넣지 않으려고 먼저 가른다.
  const consented = links.length
    ? await getDb()
        .select({ studentId: consentLogs.studentId })
        .from(consentLogs)
        .where(
          and(
            eq(consentLogs.parentId, actor.id),
            inArray(
              consentLogs.studentId,
              links.map((link) => link.id),
            ),
            eq(consentLogs.type, CLASS_ASSIGNMENT_CONSENT),
            livingConsent(),
          ),
        )
    : [];
  const sharedBy = new Set(consented.map((row) => row.studentId));

  const children: ParentChildItem[] = await Promise.all(
    links.map(async (child) => {
      // 동의가 없으면 **읽지 않는다.** 빈 배열은 「참여한 반이 없음」과 같은 모습이다.
      const [classrooms, assignmentRows] = sharedBy.has(child.id)
        ? await Promise.all([
            listStudentClassrooms(child.id),
            listVisibleAssignments(child.id, 'class-summary'),
          ])
        : [[], []];
      return {
        id: child.id,
        name: child.name,
        relation: child.relation,
        classrooms,
        // 행을 전개하지 않고 **칸을 손으로 옮긴다** — 무엇을 왜 뺐는지는 그 파일에 있다.
        assignments: assignmentRows.map(toParentAssignment),
      };
    }),
  );

  return NextResponse.json({ children });
}
