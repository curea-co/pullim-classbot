/**
 * 낸 과제 고치기·회수 — `PATCH /api/teacher/assignments/[id]` (`proc/spec/14 § 3.3.5`·`§ 3.3.6`).
 *
 * **왜 서버가 필요한가.** 회수는 종전에 브라우저 스토어만 뒤집었다. 그런데 로그인한 교사가
 * 낸 과제는 **DB 행**으로도 존재하고(`POST /api/teacher/assignments`), 학생이 보는 술어는
 * 그 행의 `dispatch_status` 를 읽는다(`app/api/_lib/assignment-visibility.ts` — `'sent'` 인
 * 것만 보여 준다). 그래서 로컬만 뒤집으면 확인 모달이 「학생의 받은 과제에서 사라져요」라고
 * 약속해 놓고 학생은 그대로 풀 수 있었다. **서버 쪽 술어는 이미 준비돼 있었다** — 상태를
 * 뒤집어 줄 자리만 없었다.
 *
 * 무엇을 고칠 수 있는지는 § 5.7 잠금 행렬이 정하고 **화면이 지킨다.** 이 라우트는 그 행렬을
 * 다시 구현하지 않되, **결과를 뒤집는 칸은 아예 받지 않는다** — 문항·모드·봇·대상은 본문에
 * 실려 와도 무시한다. 화면 하나가 실수해도 DB 가 어긋나지 않게 하는 마지막 울타리다.
 */

import { NextResponse } from 'next/server';
import { and, eq } from 'drizzle-orm';

import { getDb } from '@/lib/db';
import { assignments } from '@/lib/db/schema';
/*
  D-day 규칙은 **한 곳**에 있다 — 종전에는 이 파일이 제 사본(`dDayFromDate`)을 들고 있어서
  클라이언트(경과 시간)와 서버(날짜 경계)가 같은 컬럼에 다른 값을 적었다. 같은 과제가 교사
  화면과 학생 화면에서 다르게 읽힌 원인이다. (런타임 시간대 문제는 남는다 — `POST` 와 함께
  `Asia/Seoul` 로 못박는 것이 별건이다. `app/api/_lib/study-date.ts` 가 선례.)
*/
import { computeDDay } from '@/lib/assignment-due';
import {
  conflict,
  forbidden,
  invalidInput,
  notFound,
  readJsonBody,
  resolveActor,
  unauthorized,
} from '@/app/api/_lib/guards';

export const runtime = 'nodejs';

/**
 * 글자 수 상한 — **`POST` 와 같은 값이어야 한다.** 한쪽만 막으면 그쪽을 피해 다른 쪽으로
 * 넣을 수 있어서, 울타리가 있으나 마나가 된다(`app/api/teacher/assignments/route.ts`).
 */
const MAX_TITLE_LEN = 60;
const MAX_REASON_HINT_LEN = 200;

/** 이 라우트가 받아 주는 내기 상태 — 「내기」와 「예약」은 각자의 경로가 따로 있다. */
const PATCHABLE_STATUS = new Set(['sent', 'withdrawn']);

/**
 * 낸 과제의 일부를 고친다(회수·되돌리기 포함).
 *
 * @param req - body `{ title?, reasonHint?, dueAt?, dueLabel?, dispatchStatus? }`.
 *   마감은 **둘을 함께** 받는다 — 검증은 시각(`dueAt`)으로, 저장할 표시 문자열은 라벨(`dueLabel`)로.
 *   `POST` 와 **같은 규약**이고, 그 이유는 시간대다: 라벨은 `getHours()` 로 그려지는데 서버 런타임은
 *   UTC 라 서버가 만들면 KST 교사의 「내일 22:00」이 DB 에 「내일 13:00」으로 앉는다(아침 마감은
 *   날짜까지 하루 밀린다). 학생은 서버 행을 읽으므로 그대로 9시간 어긋난 마감을 본다.
 *   `d_day` 도 `POST` 와 **같은 규칙**(`lib/assignment-due.ts` 의 `computeDDay` — 날짜 경계)으로 센다 — 한 컬럼에 규칙이 둘이면 같은 마감이
 *   낸 경로와 고친 경로에서 다르게 읽힌다.
 * @param ctx - 동적 세그먼트 `{ id }` = 과제 id
 * @returns 200 { assignment } | 400 | 401 | 403(역할) | 404(내가 낸 과제가 아님)
 */
export async function PATCH(
  req: Request,
  ctx: { params: Promise<{ id: string }> },
): Promise<NextResponse> {
  const actor = await resolveActor(req);
  if (!actor.isIdentified) return unauthorized();
  if (actor.role !== 'teacher') return forbidden('선생님만 고칠 수 있어요.');

  const { id } = await ctx.params;
  const body = await readJsonBody(req);
  if (!body) return invalidInput('요청 본문을 읽지 못했어요.');

  const patch: Partial<typeof assignments.$inferInsert> = {};

  // **실려 온 칸만 고친다.** `readTrimmed` 는 없는 값도 빈 문자열로 접으므로, 「안 보냈다」와
  // 「비워서 보냈다」를 가르려면 타입을 먼저 본다 — 안 그러면 제목을 안 보낸 회수 요청이
  // 「제목은 비울 수 없어요」로 튕긴다.
  if (typeof body.title === 'string') {
    const title = body.title.trim().slice(0, MAX_TITLE_LEN);
    if (!title) return invalidInput('제목은 비울 수 없어요.');
    patch.title = title;
  }

  // 봇 한 마디는 **비우는 것도 뜻이 있다** — 빈 문자열은 지우라는 말이라 null 로 적는다.
  if (typeof body.reasonHint === 'string') {
    patch.reasonHint = body.reasonHint.trim().slice(0, MAX_REASON_HINT_LEN) || null;
  }

  /*
    마감 — **검증은 시각으로, 저장은 라벨로.** 시각이 있어야 「지난 마감」을 막을 수 있고,
    라벨은 교사 시간대로 그려진 것이어야 한다(위 `@param` 의 시간대 설명).
  */
  if (body.dueAt !== undefined) {
    const at = typeof body.dueAt === 'string' ? new Date(body.dueAt) : new Date(NaN);
    const ms = at.getTime();
    const now = new Date();
    if (!Number.isFinite(ms)) return invalidInput('마감을 읽지 못했어요.');
    if (ms <= now.getTime()) return invalidInput('마감은 지난 시각으로 옮길 수 없어요.');
    const label = typeof body.dueLabel === 'string' ? body.dueLabel.trim() : '';
    if (!label) return invalidInput('마감 표기를 함께 보내 주세요.');
    patch.dueLabel = label;
    patch.dDay = computeDDay(at.toISOString(), now.getTime());
  }

  const nextStatus =
    typeof body.dispatchStatus === 'string' ? body.dispatchStatus : undefined;
  if (nextStatus !== undefined) {
    if (!PATCHABLE_STATUS.has(nextStatus)) return invalidInput('바꿀 수 없는 상태예요.');
    patch.dispatchStatus = nextStatus as 'sent' | 'withdrawn';
  }

  if (Object.keys(patch).length === 0) {
    return invalidInput('고칠 내용이 없어요.');
  }

  /*
    **소유권을 조회 조건에 넣는다.** 남의 과제는 403 이 아니라 404 다 — 403 은 그 과제가
    존재한다는 사실을 알려 주는 답이다(참여 코드 라우트와 같은 규약).
  */
  /*
    **되돌리기는 회수한 것에서만.** 들어오는 값만 보고 `'sent'` 를 허용하면 초안·예약 행도
    이 문으로 학생에게 나간다 — `dispatched_at` 은 NULL 인 채로. 그 컬럼은 스키마 주석이
    「내는 전이에서만 적는다」고 못박은 자리라, 여기서 뚫으면 목록 정렬까지 어긋난다.
    그래서 **지금 상태**를 조건에 함께 넣는다.
  */
  const db = getDb();
  const owned = and(eq(assignments.id, id), eq(assignments.createdBy, actor.id));

  /*
    **「내 것이 아니다」와 「지금 상태로는 못 한다」를 가른다.** 둘을 한 조회에 접어 넣고 404 로
    답하면 화면이 그 404 를 「서버에 없는 과제(데모)」로 읽어 **로컬만 고치고 성공을 알린다** —
    탭을 둘 열어 두고 한쪽에서 이미 회수한 뒤 다른 쪽에서 누르면, 교사는 「이 브라우저에만
    반영했어요」를 보지만 사실 서버에는 이미 반영돼 있다. 먼저 소유권을 확인하고, 상태가
    안 맞으면 **409** 로 답한다(`guards.ts` 의 `conflict`).
  */
  const [current] = await db
    .select({ dispatchStatus: assignments.dispatchStatus })
    .from(assignments)
    .where(owned)
    .limit(1);
  if (!current) return notFound('과제를 찾을 수 없어요.');

  if (nextStatus === 'sent' && current.dispatchStatus !== 'withdrawn') {
    return conflict('회수한 과제만 되돌릴 수 있어요.');
  }
  if (nextStatus === 'withdrawn' && current.dispatchStatus !== 'sent') {
    return conflict('지금은 회수할 수 없는 과제예요.');
  }

  /*
    **조건을 쓰기에 함께 건다.** 위 조회와 이 UPDATE 사이에 다른 탭이 먼저 바꿀 수 있어서,
    검사만으로는 둘 다 통과해 둘 다 쓴다 — 409 를 만든 이유(「탭을 둘 열어 두고」)가 그대로
    남는다. 조건을 `WHERE` 에 넣으면 진 쪽이 0행을 받고, 위에서 소유권을 이미 확인했으므로
    그 0행은 **전이 충돌**로만 읽힌다.
  */
  const guarded =
    nextStatus === 'sent'
      ? and(owned, eq(assignments.dispatchStatus, 'withdrawn'))
      : nextStatus === 'withdrawn'
        ? and(owned, eq(assignments.dispatchStatus, 'sent'))
        : owned;

  const [updated] = await db.update(assignments).set(patch).where(guarded).returning();

  if (!updated) return conflict('다른 곳에서 먼저 바뀌었어요. 화면을 새로 고쳐 주세요.');

  return NextResponse.json({ assignment: updated });
}
