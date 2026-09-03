/**
 * 마켓 단건 — `GET /api/marketplace/bots/[botId]` (마켓 계약 §2).
 *
 * 목록과 같은 게이트다(로그인만, 역할 무관 — 이유는 목록 라우트 머리주석).
 *
 * **게시 여부를 조회 조건에 넣는다.** 읽어 온 뒤에 `isPublished` 를 보고 404 를 내면
 * 그사이 코드가 한 줄만 늘어도 안 걸린 봇의 내용이 새 나간다. `where` 에 넣으면
 * 안 걸린 봇과 **없는 봇이 똑같이 0행**이라 구분 자체가 응답에 남지 않는다.
 */

import { NextResponse } from 'next/server';
import { and, eq, sql } from 'drizzle-orm';

import { getDb } from '@/lib/db';
import { classBots, enrollments } from '@/lib/db/schema';
import { getCurrentUserIdFromRequest } from '@/lib/current-user';
import { notFound, unauthorized } from '@/app/api/_lib/guards';
import type { MarketplaceBotItem } from '@/app/api/_lib/contract-types';

export const runtime = 'nodejs';

/**
 * 게시된 봇 한 개.
 * @param req - 신원(쿠키 또는 Bearer). 역할은 보지 않는다
 * @param ctx - 동적 세그먼트 `{ botId }`
 * @returns 200 { bot: MarketplaceBotItem } | 401 | 404
 */
export async function GET(
  req: Request,
  ctx: { params: Promise<{ botId: string }> },
): Promise<NextResponse> {
  const { isIdentified } = getCurrentUserIdFromRequest(req);
  if (!isIdentified) return unauthorized();

  const { botId } = await ctx.params;
  const db = getDb();

  const [row] = await db
    .select({
      botId: classBots.id,
      name: classBots.name,
      avatarEmoji: classBots.avatarEmoji,
      subject: classBots.subject,
      grade: classBots.grade,
      tone: classBots.tone,
      greeting: classBots.greeting,
      blurb: classBots.publishBlurb,
      teacherName: classBots.teacherName,
      organization: classBots.organization,
      publishedAt: classBots.publishedAt,
    })
    .from(classBots)
    .where(and(eq(classBots.id, botId), eq(classBots.isPublished, true)))
    .limit(1);

  if (!row) return notFound('봇을 찾을 수 없어요.');

  // 목록과 같은 기준으로 센다(참여 행 실측) — 목록에서 본 숫자가 상세에서 달라지면 안 된다.
  const [countRow] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(enrollments)
    .where(eq(enrollments.botId, botId));

  const bot: MarketplaceBotItem = {
    ...row,
    publishedAt: row.publishedAt?.toISOString() ?? null,
    enrolledCount: countRow?.count ?? 0,
  };

  return NextResponse.json({ bot });
}
