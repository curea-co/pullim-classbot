/**
 * 담은 봇 빼기 — `DELETE /api/me/self-bots/[botId]` (자기주도 계약 §2).
 *
 * 게이트는 목록 라우트와 같다 — **학생만**(자기주도는 학생의 하위 컨텍스트다), 그리고
 * 지우는 술어에 **내 명의**가 함께 들어가므로 경로에 남의 봇 id 를 넣어도 남의 행에는
 * 닿지 않는다. 근거는 `app/api/me/self-bots/route.ts` 머리주석.
 *
 * 대화 기록(`chat_messages`)과 공부한 날은 남는다 — 뺀 것은 목록에서지 지난 일에서가 아니다.
 */

import { NextResponse } from 'next/server';
import { and, eq } from 'drizzle-orm';

import { getDb } from '@/lib/db';
import { selfEnrollments } from '@/lib/db/schema';
import {
  forbidden,
  invalidInput,
  resolveActor,
  unauthorized,
} from '@/app/api/_lib/guards';

export const runtime = 'nodejs';

/**
 * 내 목록에서 이 봇을 뺀다.
 *
 * **없던 행을 빼도 200 이다**(`removed:false`). 부르는 쪽의 의도는 「이건 내 목록에
 * 없어야 한다」이고 그건 어느 쪽이든 이미 이뤄져 있다 — 404 로 답하면 아무 일도 안 해도
 * 되는 자리에서 화면이 빨개진다.
 * @param req - 신원(쿠키 또는 Bearer)
 * @param ctx - 동적 세그먼트 `{ botId }`
 * @returns 200 { removed: boolean } | 400 | 401 | 403
 */
export async function DELETE(
  req: Request,
  ctx: { params: Promise<{ botId: string }> },
): Promise<NextResponse> {
  const actor = await resolveActor(req);
  if (!actor.isIdentified) return unauthorized();
  if (actor.role !== 'student') return forbidden('학생만 담은 봇을 뺄 수 있어요.');
  const studentId = actor.id;

  const { botId } = await ctx.params;
  if (!botId.trim()) return invalidInput('뺄 봇을 골라 주세요.');

  const removed = await getDb()
    .delete(selfEnrollments)
    .where(
      and(
        eq(selfEnrollments.botId, botId),
        eq(selfEnrollments.studentId, studentId),
      ),
    )
    .returning({ botId: selfEnrollments.botId });

  return NextResponse.json({ removed: removed.length > 0 });
}
