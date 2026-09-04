/**
 * 참여 코드 재발급 — `POST /api/teacher/classrooms/[id]/join-codes` (계약 §4).
 *
 * 재발급은 **갈아 끼우기**다. 반 하나에 살아 있는 코드는 항상 한 개여야 한다 —
 * 선생님이 코드를 다시 뽑는 상황은 대개 "먼저 준 코드가 새 나갔다" 이므로, 옛 코드를
 * 남겨 두면 재발급이 아무것도 막지 못한다. 그래서 지우기와 새로 뽑기를 한 트랜잭션에 묶는다.
 *
 * 경로의 반 id 는 클라이언트 입력이라 **소유권을 조회 조건에 넣는다**. 남의 반은 403 이 아니라
 * **404** 다 — 403 은 그 반이 존재한다는 사실을 알려 주는 답이다.
 */

import { NextResponse } from 'next/server';
import { and, eq } from 'drizzle-orm';

import { getDb } from '@/lib/db';
import { classBots, joinCodes } from '@/lib/db/schema';
import { issueJoinCode, JoinCodeExhaustedError } from '@/lib/join-code';
import {
  conflict,
  forbidden,
  invalidInput,
  notFound,
  resolveActor,
  unauthorized,
} from '@/app/api/_lib/guards';
import { loadOwnedClassroom } from '@/app/api/_lib/classroom-pair';

export const runtime = 'nodejs';

/**
 * 이 반의 참여 코드를 새로 뽑는다(옛 코드는 무효).
 * @param req - 신원(쿠키 또는 Bearer)
 * @param ctx - 동적 세그먼트 `{ id }` = 반 id
 * @returns 201 { joinCode } | 400 | 401 | 403 | 404 | 409
 */
export async function POST(
  req: Request,
  ctx: { params: Promise<{ id: string }> },
): Promise<NextResponse> {
  const actor = await resolveActor(req);
  if (!actor.isIdentified) return unauthorized();
  if (actor.role !== 'teacher') return forbidden('선생님만 코드를 뽑을 수 있어요.');

  const { id: classroomId } = await ctx.params;

  // 내 반이 아니면(없거나 남의 것이거나) 똑같이 404 — 어느 쪽인지 알려 주지 않는다.
  const owned = await loadOwnedClassroom(classroomId, actor.id);
  if (!owned) return notFound('수업방을 찾을 수 없어요.');
  if (!owned.pair) {
    return conflict('이 수업방에 연결된 봇이 없어 코드를 뽑을 수 없어요.');
  }

  const botId = owned.pair.botId;
  const db = getDb();

  // 짝 봇도 내 것이어야 한다 — 소유권을 조회 조건에 넣어 남의 봇은 0행으로 떨어뜨린다.
  const [bot] = await db
    .select({ id: classBots.id })
    .from(classBots)
    .where(and(eq(classBots.id, botId), eq(classBots.teacherId, actor.id)))
    .limit(1);
  if (!bot) return notFound('수업방에 연결된 봇을 찾을 수 없어요.');

  try {
    const joinCode = await db.transaction(async (tx) => {
      // 옛 코드는 여기서 죽는다 — 재발급이 곧 무효화다.
      await tx
        .delete(joinCodes)
        .where(
          and(eq(joinCodes.botId, botId), eq(joinCodes.classroomId, classroomId)),
        );

      // teacherId 필수 — NULL 이면 소유권 복합 FK 가 검사에서 빠진다.
      return issueJoinCode(tx, { botId, classroomId, teacherId: actor.id });
    });

    return NextResponse.json({ joinCode }, { status: 201 });
  } catch (error) {
    if (error instanceof JoinCodeExhaustedError) {
      return conflict(error.message);
    }
    // FK 위반 등 쓰기 실패는 정본 라우트와 같게 400 으로 답한다(500 을 흘리지 않는다).
    return invalidInput('참여 코드를 뽑지 못했어요.');
  }
}
