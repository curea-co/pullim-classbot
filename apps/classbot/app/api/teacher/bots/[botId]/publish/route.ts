/**
 * 봇 게시 · 게시 내리기 — `POST`/`DELETE /api/teacher/bots/[botId]/publish` (마켓 계약 §2).
 *
 * 게시는 **내 봇을 남에게 보이게 하는 행위**라 소유권이 곧 조회 조건이다. 경로의 봇 id 는
 * 클라이언트 입력이므로 먼저 읽고 나중에 주인을 비교하지 않고, `where` 에 명의를 함께 넣어
 * **남의 행이 아예 안 잡히게** 한다 — 0행이면 404 다. 403 으로 답하면 "그 봇은 있는데 네 것이
 * 아니다" 를 알려 주는 셈이라, 남의 봇이 존재한다는 사실이 새 나간다.
 *
 * 두 메서드가 한 파일에 있는 이유: 게시 상태는 **하나의 자원**이고 켜고 끄는 두 면일 뿐이다.
 * `POST`/`DELETE` 가 같은 `where` 를 공유해야 소유권 판정이 한 벌로 유지된다.
 */

import { NextResponse } from 'next/server';
import { and, eq, sql } from 'drizzle-orm';

import { getDb } from '@/lib/db';
import { classBots } from '@/lib/db/schema';
import {
  forbidden,
  invalidInput,
  notFound,
  readJsonBody,
  resolveActor,
  unauthorized,
} from '@/app/api/_lib/guards';

export const runtime = 'nodejs';

/**
 * 한 줄 소개 길이 상한.
 * 마켓 카드 한 줄에 들어갈 만큼만 받는다 — 카드가 감당 못 할 길이를 저장해 두면
 * 화면마다 다른 방식으로 잘려서 같은 봇이 자리마다 달라 보인다.
 */
const BLURB_MAX = 200;

/**
 * 요청 본문에서 한 줄 소개를 꺼낸다.
 *
 * 길이는 `String.length`(UTF-16 단위)가 아니라 **코드 포인트**로 센다 — 이모지 한 글자가
 * 2로 세어지면 사람이 보는 「200자」와 화면의 판정이 어긋난다.
 *
 * ⚠️ **생략도 「없음」이다.** `blurb` 를 안 보내면 null 이 되어 저장된 소개를 **지운다**
 * (아래 POST 의 「통째로 덮어쓴다」 참고). 부분 수정(PATCH)처럼 「안 보낸 건 그대로 둔다」로
 * 바꾸지 마라 — 그러면 생략과 `''` 가 다른 뜻이 되어, 호출부가 그 차이를 틀리는 순간
 * 지우려던 소개가 남고 남기려던 소개가 지워진다. 어느 쪽으로 틀렸는지도 응답에 안 보인다.
 *
 * @param body - 파싱된 요청 본문(본문이 없으면 빈 객체)
 * @returns 저장할 값(빈 소개는 null) 또는 거절 사유
 */
function readBlurb(
  body: Record<string, unknown>,
): { ok: true; value: string | null } | { ok: false; message: string } {
  const raw = body.blurb;
  // 생략·null 은 「안 적었다」 — 게시 자체는 소개 없이도 된다.
  if (raw === undefined || raw === null) return { ok: true, value: null };
  if (typeof raw !== 'string') {
    return { ok: false, message: '한 줄 소개는 글로 적어 주세요.' };
  }

  const trimmed = raw.trim();
  if ([...trimmed].length > BLURB_MAX) {
    return { ok: false, message: `한 줄 소개는 ${BLURB_MAX}자까지 적을 수 있어요.` };
  }
  // 빈 문자열은 「지운다」 — 공백만 남은 소개를 카드에 띄우지 않는다.
  return { ok: true, value: trimmed || null };
}

/**
 * 봇을 마켓에 건다.
 *
 * `published_at` 은 **처음 걸린 시각을 지킨다**(`coalesce`). 소개 문구만 고치려고 다시
 * 게시했을 때 시각이 갱신되면 목록 맨 위로 튀어 올라, 새로 올라온 봇처럼 보인다.
 * 내렸다 다시 걸면 그때는 null 이 되어 있으므로 새 시각이 찍힌다.
 *
 * ⚠️ **한 줄 소개는 요청이 통째로 덮어쓴다** — 안 보내면 저장돼 있던 소개가 지워진다.
 * 이 요청 하나가 게시 상태를 온전히 정하므로 「보낸 대로 된다」가 성립하고, 같은 요청을
 * 다시 보내면 언제나 같은 결과가 된다.
 *
 * 그래서 **화면은 게시 폼을 항상 저장된 소개로 채워 보내야 한다.** 읽는 자리는
 * `GET /api/teacher/classrooms` 의 `publishBlurb` 다 — 그 조회는 게시 여부로 거르지 않으므로
 * **내려간 봇의 소개도 그대로 읽힌다**(DELETE 가 소개를 남기는 이유가 이것이다).
 * 마켓 목록으로 읽으려 하지 마라. 거긴 게시된 봇만 있어서 내린 순간 소개가 안 보인다.
 *
 * @param req - 신원(쿠키 또는 Bearer) + body `{ blurb?: string }`(본문 생략 가능 — 생략은 「소개 없음」)
 * @param ctx - 동적 세그먼트 `{ botId }`
 * @returns 200 { bot } | 400 | 401 | 403 | 404
 */
export async function POST(
  req: Request,
  ctx: { params: Promise<{ botId: string }> },
): Promise<NextResponse> {
  const actor = await resolveActor(req);
  if (!actor.isIdentified) return unauthorized();
  if (actor.role !== 'teacher') return forbidden('선생님만 봇을 공유할 수 있어요.');

  const { botId } = await ctx.params;

  // 본문은 통째로 생략할 수 있다(소개 없이 그냥 게시). 못 읽었으면 빈 객체로 본다.
  const blurb = readBlurb((await readJsonBody(req)) ?? {});
  if (!blurb.ok) return invalidInput(blurb.message);

  // 소유권을 조회 조건에 넣는다 — 남의 봇은 0행이 되어 404 로 떨어진다.
  const [bot] = await getDb()
    .update(classBots)
    .set({
      isPublished: true,
      publishedAt: sql`coalesce(${classBots.publishedAt}, now())`,
      publishBlurb: blurb.value,
    })
    .where(and(eq(classBots.id, botId), eq(classBots.teacherId, actor.id)))
    .returning();

  if (!bot) return notFound('봇을 찾을 수 없어요.');
  return NextResponse.json({ bot });
}

/**
 * 게시를 내린다.
 *
 * `published_at` 을 **null 로 되돌린다** — 안 그러면 "내렸는데 게시 시각이 남아 있는" 행이
 * 되어, 다음에 이 컬럼으로 상태를 판정하는 코드가 조용히 틀린 답을 낸다.
 *
 * 한 줄 소개는 남긴다. 대개 잠깐 내렸다 다시 거는 흐름이라, 지우면 매번 다시 적어야 한다.
 * 다만 **남기는 것만으로는 부족하다** — 다시 걸 때 POST 가 그 값을 도로 받아야 살아남는다.
 * 그 값을 화면이 읽어 가는 자리는 `GET /api/teacher/classrooms` 의 `publishBlurb` 이고,
 * 그 조회가 게시 여부로 거르지 않는 것이 이 「남긴다」를 실제로 쓸모 있게 만든다.
 *
 * @param req - 신원(쿠키 또는 Bearer)
 * @param ctx - 동적 세그먼트 `{ botId }`
 * @returns 200 { bot } | 401 | 403 | 404
 */
export async function DELETE(
  req: Request,
  ctx: { params: Promise<{ botId: string }> },
): Promise<NextResponse> {
  const actor = await resolveActor(req);
  if (!actor.isIdentified) return unauthorized();
  if (actor.role !== 'teacher') return forbidden('선생님만 공유를 그만둘 수 있어요.');

  const { botId } = await ctx.params;

  const [bot] = await getDb()
    .update(classBots)
    .set({ isPublished: false, publishedAt: null })
    .where(and(eq(classBots.id, botId), eq(classBots.teacherId, actor.id)))
    .returning();

  if (!bot) return notFound('봇을 찾을 수 없어요.');
  return NextResponse.json({ bot });
}
