/**
 * 담은 봇 빼기 — `DELETE /api/me/self-bots/[botId]` (자기주도 계약 §2).
 *
 * 게이트는 목록 라우트와 같다(로그인만, 역할 무관). 지우는 술어에 **내 명의**가 함께
 * 들어가므로 경로에 남의 봇 id 를 넣어도 남의 행에는 닿지 않는다.
 *
 * 대화 기록(`chat_messages`)과 공부한 날은 남는다 — 뺀 것은 목록에서지 지난 일에서가 아니다.
 */

import { NextResponse } from 'next/server';
import { and, eq } from 'drizzle-orm';

import { getDb } from '@/lib/db';
import { selfEnrollments } from '@/lib/db/schema';
import { getCurrentUserIdFromRequest } from '@/lib/current-user';
import { invalidInput, unauthorized } from '@/app/api/_lib/guards';

export const runtime = 'nodejs';

/**
 * 내 목록에서 이 봇을 뺀다.
 *
 * **없던 행을 빼도 200 이다**(`removed:false`). 부르는 쪽의 의도는 「이건 내 목록에
 * 없어야 한다」이고 그건 어느 쪽이든 이미 이뤄져 있다 — 404 로 답하면 아무 일도 안 해도
 * 되는 자리에서 화면이 빨개진다.
 * @param req - 신원(쿠키 또는 Bearer)
 * @param ctx - 동적 세그먼트 `{ botId }`
 * @returns 200 { removed: boolean } | 400 | 401
 */
export async function DELETE(
  req: Request,
  ctx: { params: Promise<{ botId: string }> },
): Promise<NextResponse> {
  const { id: studentId, isIdentified } = getCurrentUserIdFromRequest(req);
  if (!isIdentified) return unauthorized();

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
