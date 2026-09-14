/**
 * 담은 봇 — 읽기 + 담기 (자기주도 계약 §2).
 *
 * ## 게이트는 **학생 전용**이다
 * 자기주도는 역할이 아니라 **학생의 하위 컨텍스트**다(dual-mode spec §1·§7 — "two student
 * modes", "mode is a student sub-context (not a Role)"). 그러니 교사·학부모 신원으로는
 * 이 테이블에 행이 생기지도, 읽히지도 않는다 — `resolveActor` 가 도메인 `users.role` 을
 * 권위로 보고, 학생이 아니면 403 `FORBIDDEN_ROLE` 이다(`POST /api/enrollments` 와 같은 규약).
 *
 * 명의 잠금은 그대로 남아 있다: `student_id` 는 신원 해석기에서만 오고 본문에서는 절대
 * 오지 않는다. 역할 게이트는 **그 위에** 얹힌 두 번째 자물쇠다 — 하나는 「남의 것에 닿지
 * 못하게」, 다른 하나는 「학생 아닌 사람의 자기주도 기록이 아예 생기지 못하게」 한다.
 *
 * ⛔ 이건 **반 참여가 아니다.** `enrollments` 도 `class_bots.enrolled_count` 도 건드리지
 * 않는다. 교사가 보는 학생 수는 담기로 늘지 않는다.
 */

import { NextResponse } from 'next/server';
import { and, asc, eq } from 'drizzle-orm';

import { getDb } from '@/lib/db';
import { classBots, selfEnrollments } from '@/lib/db/schema';
import {
  forbidden,
  invalidInput,
  notFound,
  readJsonBody,
  readTrimmed,
  resolveActor,
  unauthorized,
} from '@/app/api/_lib/guards';
import type { SelfBotRow } from '@/app/api/_lib/contract-types';

export const runtime = 'nodejs';

/**
 * 내가 담은 봇 전부 — 담은 순(오래된 것 먼저).
 * @param req - 신원(쿠키 또는 Bearer). 역할은 도메인 `users.role` 이 권위
 * @returns 200 { bots: SelfBotRow[] } | 401 | 403
 */
export async function GET(req: Request): Promise<NextResponse> {
  const actor = await resolveActor(req);
  if (!actor.isIdentified) return unauthorized();
  if (actor.role !== 'student') return forbidden('학생만 담은 봇을 볼 수 있어요.');
  const studentId = actor.id;

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
 * ## 담기는 마켓과 **같은 조건**을 본다 — `is_published`
 * 담을 수 있는 봇은 마켓이 내보이는 봇이다(dual-mode spec §2: "Self-directed bots =
 * official curriculum tutors only"). 존재만 보면 **미게시 봇도, 남의 수업 전용 봇도 id 만
 * 알면** 자기주도 목록에 들어간다 — 마켓에 한 번도 걸린 적 없는 봇이 그 경로로 새는 것이다.
 * 그래서 술어를 `GET /api/marketplace/bots/[botId]` 와 **글자 그대로 맞춘다**:
 * `and(id, is_published)`. 안 걸린 봇과 없는 봇이 **똑같이 0행**이라 어느 쪽인지 응답에
 * 남지 않고(둘 다 404), 그래서 「그 id 의 봇이 있긴 하다」가 새 나가지 않는다.
 *
 * ## ⚠️ 반대 방향은 **일부러 비대칭**이다 — 이미 담은 봇은 공유가 내려가도 돈다
 * 게이트는 **담는 순간**에만 선다. 이미 담긴 행은 나중에 그 봇의 게시가 내려가도 그대로
 * 남고 계속 쓸 수 있다(P1 의 결정). 「지금 마켓에 있는가」와 「그때 담았는가」는 다른
 * 사실이고, 학생이 쓰던 튜터가 교사의 게시 해제로 조용히 사라지면 안 되기 때문이다.
 * 그러니 **읽기 쪽(GET)이나 목록 조인에 `is_published` 를 더하지 마라** — 그 순간
 * 이 비대칭이 깨져 담아 둔 봇이 목록에서 증발한다.
 *
 * FK 를 지우지 않은 이유도 여기 있다: 위 조회와 아래 삽입 사이에 봇이 지워지는 경합에서는
 * 조회가 이미 지나간 뒤라, 마지막으로 막는 것은 여전히 FK 다(아래 catch).
 * @param req - body `{ botId }`. 명의는 본문이 아니라 신원에서 온다
 * @returns 201 { bot: SelfBotRow } | 200 { bot: SelfBotRow }(이미 담음) | 400 | 401 | 403 | 404
 */
export async function POST(req: Request): Promise<NextResponse> {
  const actor = await resolveActor(req);
  if (!actor.isIdentified) return unauthorized();
  if (actor.role !== 'student') return forbidden('학생만 봇을 담을 수 있어요.');
  const studentId = actor.id;

  const body = await readJsonBody(req);
  if (!body) return invalidInput('요청 본문을 읽지 못했어요.');

  const botId = readTrimmed(body.botId);
  if (!botId) return invalidInput('담을 봇을 골라 주세요.');

  const db = getDb();

  // 마켓에 걸린 봇만 담긴다 — 술어에 `is_published` 를 넣어 「없는 봇」과 구분되지 않게 한다.
  const [publishedBot] = await db
    .select({ botId: classBots.id })
    .from(classBots)
    .where(and(eq(classBots.id, botId), eq(classBots.isPublished, true)))
    .limit(1);

  if (!publishedBot) return notFound('봇을 찾을 수 없어요.');

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
    // 위 조회와 이 삽입 사이에 봇이 지워진 경합(FK 위반) 등 쓰기 실패 —
    // 정본 라우트와 같게 400 으로 답한다(500 을 흘리지 않는다).
    return invalidInput('봇을 담지 못했어요.');
  }
}
