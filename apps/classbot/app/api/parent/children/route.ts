/**
 * 학부모 — 내 자녀 (계약 §4 「학부모」).
 *
 * 자녀 목록은 `parent_child_links` 가 권위다. 그 링크에 없는 학생은 어떤 경로로도
 * 조회되지 않는다 — 학부모가 남의 아이 자료를 볼 수 있는 구멍이 여기서 닫힌다.
 *
 * 역할 판정은 도메인 `users.role` 을 본다. 공유 JWT 타입에는 아직 `parent` 가 없어서
 * claim 만으로는 학부모를 알아볼 수 없다(`app/api/_lib/guards.ts` 주석 참조).
 *
 * ## ⏸ 반·과제 내용은 **아직 나가지 않는다** — 임시다 (인도자: #271)
 *
 * [05 § 11.4](../../../../../proc/spec/05-business-rules.md) 는 학부모의 「반·과제 현황」을
 * 학생의 살아 있는 동의(`consent_logs.class_assignment_summary`) 뒤에 두라고 못박았다.
 * 그 동의를 표현할 스키마 — `type` 의 값 둘과 `revoked_at` — 은 **이 PR 에 없다.**
 * 마이그레이션 `0007` 이 들여오고 그건 **#271** 의 것이다(§ 11.4 머리말이 인도자를 적어
 * 두었다). 그래서 여기서 규칙 3 의 술어(`revoked_at IS NULL AND …`)를 쓰면 **없는 컬럼을
 * 참조**하게 된다.
 *
 * 게이트를 걸 수 없다면 **열어 두지 않고 닫아 둔다.** 이 라우트는 지금 스택의 맨 앞이라,
 * 열어 두면 `dev` 가 #271 까지 머지 다섯 번 동안 게이트 없는 열람 경로를 안고 간다.
 * 그래서 `classrooms`·`assignments` 를 **아예 조회하지 않고** 빈 배열로 내보낸다 —
 * 규칙 1(「미동의 자녀의 데이터는 애초에 읽지 않는다 — 읽어 놓고 안 보내는 것과 다르다」)을
 * 지금 형태로도 그대로 만족한다.
 *
 * **자녀 목록(이름·관계)은 가리지 않는다.** § 11.4 규칙 2 의 단서 그대로다 — 가리면
 * 「이어진 자녀가 아예 없다」와 구분이 사라진다. 반대로 내용이 빈 배열인 것은 부모 눈에
 * 「참여한 반이 없다」와 **같은 모습**이라, 규칙 2 가 요구하는 「미동의와 무활동을 구별할 수
 * 없게」를 만족한다.
 *
 * **#271 이 오면 이 빈 배열이 조건부가 된다** — 동의가 살아 있는 자녀만 실제로 조회하고,
 * 나머지는 지금과 똑같이 빈 배열로 남는다. 그때 쓸 매퍼와 그 인가 판단은 지우지 않고
 * `app/api/_lib/parent-views.ts` 에 테스트와 함께 살려 두었다.
 */

import { NextResponse } from 'next/server';
import { asc, eq } from 'drizzle-orm';

import { getDb } from '@/lib/db';
import { parentChildLinks, users } from '@/lib/db/schema';
import { forbidden, resolveActor, unauthorized } from '@/app/api/_lib/guards';
import type { ParentChildItem } from '@/app/api/_lib/contract-types';

export const runtime = 'nodejs';

/**
 * 내 자녀 목록. 반·과제 내용은 동의 게이트(#271)가 생기기 전까지 빈 배열이다.
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

  const children: ParentChildItem[] = links.map((child) => ({
    id: child.id,
    name: child.name,
    relation: child.relation,
    // 동의 게이트 전이라 내용은 읽지도 않는다(머리주석 「⏸」 참조). 여기를 채우려면
    // 먼저 `consent_logs` 조회를 **조회 조건 안에** 넣어야 한다 — 그게 #271 이다.
    classrooms: [],
    assignments: [],
  }));

  return NextResponse.json({ children });
}
