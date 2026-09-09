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
 * 학생의 `class_assignment_summary` 동의 뒤에 뒀다. 규칙 1 은 미동의 자녀의 데이터를
 * **애초에 읽지 않는 것** — 읽어 놓고 안 보내는 것과 다르다.
 *
 * 그래서 이 라우트는 동의를 **먼저 조회해 두지 않는다.** 동의를 한 번 읽어 「열린 자녀」
 * 명단을 만들고 그 뒤에 반·과제를 조건 없이 읽으면, 두 걸음 사이에 학생이 공유를 거뒀을 때
 * 이미 통과한 명단이 두 번째 질의를 그대로 열어 준다 — 철회 뒤의 자료가 나간다. 동의 술어는
 * 반·과제 질의의 `where` 안에 함께 서고(`app/api/_lib/parent-views.ts` → `consent.ts`),
 * 그래서 동의와 자료는 **같은 스냅샷**에서 판정된다.
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
import { asc, eq } from 'drizzle-orm';

import { getDb } from '@/lib/db';
import { parentChildLinks, users } from '@/lib/db/schema';
import { forbidden, resolveActor, unauthorized } from '@/app/api/_lib/guards';
import {
  listConsentedChildAssignments,
  listConsentedChildClassrooms,
  toParentAssignment,
} from '@/app/api/_lib/parent-views';
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

  const children: ParentChildItem[] = await Promise.all(
    links.map(async (child) => {
      /*
        동의는 **이 두 질의의 `where` 안**에 있다(`parent-views.ts`). 그래서 여기서 「열렸나」를
        미리 묻지 않는다 — 미동의 자녀의 질의는 0행으로 돌아오고, 응답은 「참여한 반이 없는
        자녀」와 **같은 모양**이 된다(규칙 2: 미동의와 무활동을 구별할 수 없게).

        미동의여도 질의를 보내는 것이 낭비처럼 보일 수 있으나, 그 「보내지 않기」를 위한
        사전 조회가 바로 철회의 틈을 만든다. 게다가 이 EXISTS 는 바깥 행을 참조하지 않는
        **상수 술어**라, 닫힌 자녀 쪽은 플래너가 한 번 판정하고 본 테이블을 훑지도 않는다.
      */
      const [classrooms, assignmentRows] = await Promise.all([
        listConsentedChildClassrooms(actor.id, child.id),
        listConsentedChildAssignments(actor.id, child.id),
      ]);
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
