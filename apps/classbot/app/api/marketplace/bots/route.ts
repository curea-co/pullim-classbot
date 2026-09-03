/**
 * 마켓 목록 — `GET /api/marketplace/bots` (마켓 계약 §2).
 *
 * **역할 게이트가 없는 것이 이 라우트의 요지다.** 학생·교사·학부모가 같은 목록을 본다 —
 * 마켓은 "둘러보는 곳" 이라 누가 보든 내용이 같아야 한다. 그래서 도메인 역할을 되묻는
 * `resolveActor` 대신 신원만 확인하는 `getCurrentUserIdFromRequest` 를 쓴다:
 * 역할을 아예 읽지 않으므로 **나중에 누가 역할 분기를 끼워 넣을 자리가 없다.**
 * (`app/api/bots/route.ts` 가 쓰는 것과 같은 읽기 게이트다.)
 *
 * 로그인만 요구하는 이유: 게시된 봇에도 선생님 이름·소속이 붙는다. 인증 없이 열어 두면
 * 그 명단이 그대로 공개 목록이 된다.
 */

import { NextResponse } from 'next/server';
import { desc, eq, inArray, sql } from 'drizzle-orm';

import { getDb } from '@/lib/db';
import { classBots, enrollments } from '@/lib/db/schema';
import { getCurrentUserIdFromRequest } from '@/lib/current-user';
import { unauthorized } from '@/app/api/_lib/guards';
import type { MarketplaceBotItem } from '@/app/api/_lib/contract-types';

export const runtime = 'nodejs';

/**
 * 게시된 봇 전부 — 최근에 걸린 것부터.
 * @param req - 신원(쿠키 또는 Bearer). 역할은 보지 않는다
 * @returns 200 { bots: MarketplaceBotItem[] } | 401
 */
export async function GET(req: Request): Promise<NextResponse> {
  const { isIdentified } = getCurrentUserIdFromRequest(req);
  if (!isIdentified) return unauthorized();

  const db = getDb();

  // 마켓이 보여줄 칸만 고른다 — 라이브 상태·빠른 질문은 참여자 것이라 내보내지 않는다.
  const rows = await db
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
    .where(eq(classBots.isPublished, true))
    .orderBy(desc(classBots.publishedAt));

  if (rows.length === 0) return NextResponse.json({ bots: [] });

  // 참여 인원은 `class_bots.enrolled_count`(시드가 넣어 둔 전시용 숫자)가 아니라
  // 참여 행을 실제로 센다 — 교사 수업방 카드의 `studentCount` 와 같은 수를 보여야
  // 같은 봇이 화면마다 다른 인원으로 보이지 않는다.
  const countRows = await db
    .select({ botId: enrollments.botId, count: sql<number>`count(*)::int` })
    .from(enrollments)
    .where(
      inArray(
        enrollments.botId,
        rows.map((r) => r.botId),
      ),
    )
    .groupBy(enrollments.botId);
  const countByBot = new Map(countRows.map((r) => [r.botId, r.count]));

  const bots: MarketplaceBotItem[] = rows.map((row) => ({
    ...row,
    publishedAt: row.publishedAt?.toISOString() ?? null,
    enrolledCount: countByBot.get(row.botId) ?? 0,
  }));

  return NextResponse.json({ bots });
}
