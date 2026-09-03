/**
 * 담은 봇 — 읽기 + 담기 (자기주도 계약 §2).
 *
 * **역할 게이트가 없다.** 행이 언제나 호출자 명의로만 생기고 호출자 명의로만 읽히므로,
 * 학생·교사·학부모 누가 쳐도 자기 것 말고는 닿을 수 없다. 남의 것을 막는 일을 역할이
 * 아니라 **조회·쓰기 조건**이 한다 — `student_id` 는 신원 해석기에서만 나오고 본문에서는
 * 절대 오지 않는다(마켓 계약의 목록·상세 라우트와 같은 게이트).
 *
 * ⛔ 이건 **반 참여가 아니다.** `enrollments` 도 `class_bots.enrolled_count` 도 건드리지
 * 않는다. 교사가 보는 학생 수는 담기로 늘지 않는다.
 */

import { NextResponse } from 'next/server';
import { and, asc, eq } from 'drizzle-orm';

import { getDb } from '@/lib/db';
import { selfEnrollments } from '@/lib/db/schema';
import { getCurrentUserIdFromRequest } from '@/lib/current-user';
import {
  invalidInput,
  readJsonBody,
  readTrimmed,
  unauthorized,
} from '@/app/api/_lib/guards';
import type { SelfBotRow } from '@/app/api/_lib/contract-types';

export const runtime = 'nodejs';

/**
 * 내가 담은 봇 전부 — 담은 순(오래된 것 먼저).
 * @param req - 신원(쿠키 또는 Bearer). 역할은 보지 않는다
 * @returns 200 { bots: SelfBotRow[] } | 401
 */
export async function GET(req: Request): Promise<NextResponse> {
  const { id: studentId, isAuthenticated } = getCurrentUserIdFromRequest(req);
  if (!isAuthenticated) return unauthorized();

  const rows = await getDb()
    .select({ botId: selfEnrollments.botId, addedAt: selfEnrollments.addedAt })
    .from(selfEnrollments)
    .where(eq(selfEnrollments.studentId, studentId))
    // 같은 초에 둘을 담아도 순서가 흔들리지 않게 bot_id 를 동점 처리 축으로 둔다.
    .orderBy(asc(selfEnrollments.addedAt), asc(selfEnrollments.botId));

  const bots: SelfBotRow[] = rows.map((r) => ({
    botId: r.botId,
    addedAt: r.addedAt.toISOString(),
  }));

  return NextResponse.json({ bots });
}

/**
 * 봇을 담는다 — 같은 봇을 두 번 담아도 한 줄이다(멱등).
 *
 * 두 번째 담기를 오류로 답하지 않는 이유는 참여 라우트(`POST /api/enrollments`)와 같다 —
 * 버튼을 두 번 눌렀다고 빨간 에러를 볼 이유가 없다. 새로 생겼을 때만 201 이고
 * 이미 있었으면 200 인데, **몸통은 둘 다 같다**(부르는 쪽이 갈라 쓰지 않아도 된다).
 *
 * 게시가 내려간 봇도 담긴다. 이미 담은 학생의 봇이 계속 도는 것이 P1 의 결정이라
 * 담기 시점에만 `is_published` 를 요구하면 그 결정과 어긋난다 — FK 가 「실재하는 봇인가」만 지킨다.
 * @param req - body `{ botId }`. 명의는 본문이 아니라 신원에서 온다
 * @returns 201 { bot: SelfBotRow } | 200 { bot: SelfBotRow }(이미 담음) | 400 | 401
 */
export async function POST(req: Request): Promise<NextResponse> {
  const { id: studentId, isAuthenticated } = getCurrentUserIdFromRequest(req);
  if (!isAuthenticated) return unauthorized();

  const body = await readJsonBody(req);
  if (!body) return invalidInput('요청 본문을 읽지 못했어요.');

  const botId = readTrimmed(body.botId);
  if (!botId) return invalidInput('담을 봇을 골라 주세요.');

  const db = getDb();

  try {
    const inserted = await db
      .insert(selfEnrollments)
      .values({ botId, studentId })
      .onConflictDoNothing({
        target: [selfEnrollments.botId, selfEnrollments.studentId],
      })
      .returning({ botId: selfEnrollments.botId, addedAt: selfEnrollments.addedAt });

    if (inserted.length > 0) {
      const row = inserted[0];
      const bot: SelfBotRow = { botId: row.botId, addedAt: row.addedAt.toISOString() };
      return NextResponse.json({ bot }, { status: 201 });
    }

    // 이미 담겨 있던 경우 — 있는 행을 그대로 돌려준다. **처음 담은 시각**이라
    // 목록 순서가 재시도로 바뀌지 않는다.
    const [existing] = await db
      .select({ botId: selfEnrollments.botId, addedAt: selfEnrollments.addedAt })
      .from(selfEnrollments)
      .where(
        and(
          eq(selfEnrollments.botId, botId),
          eq(selfEnrollments.studentId, studentId),
        ),
      )
      .limit(1);

    // 충돌로 흡수됐는데 행이 없다 = 그사이 누가 뺐다. 다시 담지 않고 400 으로 답한다
    // (여기서 재시도하면 「빼기」를 되돌리는 셈이다).
    if (!existing) return invalidInput('봇을 담지 못했어요.');

    const bot: SelfBotRow = {
      botId: existing.botId,
      addedAt: existing.addedAt.toISOString(),
    };
    return NextResponse.json({ bot });
  } catch {
    // FK 위반(없는 봇 id) 등 쓰기 실패 — 정본 라우트와 같게 400 으로 답한다(500 을 흘리지 않는다).
    return invalidInput('봇을 담지 못했어요.');
  }
}
