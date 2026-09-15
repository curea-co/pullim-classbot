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
import {
  forbidden,
  invalidInput,
  notFound,
  readJsonBody,
  resolveActor,
  unauthorized,
} from '@/app/api/_lib/guards';

export const runtime = 'nodejs';

/** 이 라우트가 받아 주는 내기 상태 — 「내기」와 「예약」은 각자의 경로가 따로 있다. */
const PATCHABLE_STATUS = new Set(['sent', 'withdrawn']);

/**
 * 낸 과제의 일부를 고친다(회수·되돌리기 포함).
 *
 * @param req - body `{ title?, reasonHint?, dueLabel?, dDay?, dueAt?, dispatchStatus? }`
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
    const title = body.title.trim();
    if (!title) return invalidInput('제목은 비울 수 없어요.');
    patch.title = title;
  }

  // 봇 한 마디는 **비우는 것도 뜻이 있다** — 빈 문자열은 지우라는 말이라 null 로 적는다.
  if (typeof body.reasonHint === 'string') {
    patch.reasonHint = body.reasonHint.trim() || null;
  }

  if (typeof body.dueLabel === 'string' && body.dueLabel.trim()) {
    patch.dueLabel = body.dueLabel.trim();
  }
  if (typeof body.dDay === 'string' && body.dDay.trim()) {
    patch.dDay = body.dDay.trim();
  }

  if (typeof body.dispatchStatus === 'string') {
    if (!PATCHABLE_STATUS.has(body.dispatchStatus)) {
      return invalidInput('바꿀 수 없는 상태예요.');
    }
    patch.dispatchStatus = body.dispatchStatus as 'sent' | 'withdrawn';
  }

  if (Object.keys(patch).length === 0) {
    return invalidInput('고칠 내용이 없어요.');
  }

  /*
    **소유권을 조회 조건에 넣는다.** 남의 과제는 403 이 아니라 404 다 — 403 은 그 과제가
    존재한다는 사실을 알려 주는 답이다(참여 코드 라우트와 같은 규약).
  */
  const [updated] = await getDb()
    .update(assignments)
    .set(patch)
    .where(and(eq(assignments.id, id), eq(assignments.createdBy, actor.id)))
    .returning();

  if (!updated) return notFound('과제를 찾을 수 없어요.');

  return NextResponse.json({ assignment: updated });
}
