/**
 * 참여 코드로 수업방 들어가기 — `POST /api/enrollments` (계약 §4 「학생」).
 *
 * 코드는 대소문자·하이픈을 가리지 않는다(`normalizeJoinCode`). 예전 데모 코드
 * (`MATH-2024` 처럼 정규화하면 모양이 달라지는 것)는 원문 그대로도 한 번 더 찾아 본다.
 *
 * 같은 방에 두 번 들어가는 건 **오류가 아니다**. `enrollments` PK 가 (bot_id, student_id)
 * 라 두 번째 시도는 `onConflictDoNothing` 으로 조용히 흡수되고 200 을 돌려준다 —
 * 코드를 두 번 눌렀다고 학생에게 빨간 에러를 보여줄 이유가 없다.
 *
 * `enrolled_count` 는 **세어서 다시 쓴다**(+1 누적 금지). 멱등 재시도·직접 삭제 같은
 * 경로에서 값이 어긋나도 다음 참여 때 스스로 맞춰진다.
 */

import { NextResponse } from 'next/server';
import { and, eq, sql } from 'drizzle-orm';

import { getDb } from '@/lib/db';
import { classBots, classrooms, enrollments, joinCodes } from '@/lib/db/schema';
import { normalizeJoinCode } from '@/lib/join-code';
import {
  forbidden,
  invalidInput,
  notFound,
  readJsonBody,
  readTrimmed,
  resolveActor,
  unauthorized,
} from '@/app/api/_lib/guards';

export const runtime = 'nodejs';

/**
 * 참여 코드로 수업방에 들어간다.
 * @param req - body `{ code }`
 * @returns 201 { enrollment, alreadyJoined:false } | 200 { enrollment, alreadyJoined:true }
 *          | 400 | 401 | 403 | 404
 */
export async function POST(req: Request): Promise<NextResponse> {
  const actor = await resolveActor(req);
  if (!actor.isIdentified) return unauthorized();
  if (actor.role !== 'student') return forbidden('학생만 참여할 수 있어요.');

  const body = await readJsonBody(req);
  if (!body) return invalidInput('요청 본문을 읽지 못했어요.');

  const raw = readTrimmed(body.code);
  if (!raw) return invalidInput('참여 코드를 입력해 주세요.');

  const db = getDb();

  // 정규화형으로 먼저 찾고, 못 찾으면 원문 대문자로 한 번 더(레거시 `MATH-2024`).
  const normalized = normalizeJoinCode(raw);
  const candidates = [normalized, raw.toUpperCase()].filter(
    (c, i, arr) => c && arr.indexOf(c) === i,
  );

  let codeRow: typeof joinCodes.$inferSelect | undefined;
  for (const candidate of candidates) {
    const [hit] = await db
      .select()
      .from(joinCodes)
      .where(eq(joinCodes.code, candidate))
      .limit(1);
    if (hit) {
      codeRow = hit;
      break;
    }
  }
  if (!codeRow) {
    return notFound('참여 코드를 찾을 수 없어요. 다시 확인해 주세요.');
  }

  const [bot] = await db
    .select({
      id: classBots.id,
      teacherName: classBots.teacherName,
      organization: classBots.organization,
    })
    .from(classBots)
    .where(eq(classBots.id, codeRow.botId))
    .limit(1);
  const [classroom] = await db
    .select({ id: classrooms.id, label: classrooms.label })
    .from(classrooms)
    .where(eq(classrooms.id, codeRow.classroomId))
    .limit(1);
  if (!bot || !classroom) {
    return notFound('참여 코드에 연결된 수업방이 없어요.');
  }

  // 기존 행과 같은 표기 — '김수학' → '김수학 선생님'(이미 붙어 있으면 그대로).
  const assignedBy = bot.teacherName.endsWith('선생님')
    ? bot.teacherName
    : `${bot.teacherName} 선생님`;

  const result = await db.transaction(async (tx) => {
    const inserted = await tx
      .insert(enrollments)
      .values({
        botId: bot.id,
        studentId: actor.id,
        classroomId: classroom.id,
        classroomLabel: classroom.label,
        assignedBy,
        // DEFAULT 가 없는 컬럼 — 여기서 반드시 적는다.
        assignedAt: new Date(),
        via: bot.organization,
      })
      .onConflictDoNothing({
        target: [enrollments.botId, enrollments.studentId],
      })
      .returning();

    // 누적(+1)이 아니라 세어서 덮어쓴다 — 멱등 재시도에서도 어긋나지 않는다.
    await tx
      .update(classBots)
      .set({
        enrolledCount: sql`(select count(*)::int from ${enrollments} where ${enrollments.botId} = ${bot.id})`,
      })
      .where(eq(classBots.id, bot.id));

    if (inserted.length > 0) {
      return { enrollment: inserted[0], alreadyJoined: false };
    }

    // 이미 들어와 있던 경우 — 있는 행을 그대로 돌려준다(멱등).
    const [existing] = await tx
      .select()
      .from(enrollments)
      .where(
        and(
          eq(enrollments.botId, bot.id),
          eq(enrollments.studentId, actor.id),
        ),
      )
      .limit(1);
    return { enrollment: existing, alreadyJoined: true };
  });

  return NextResponse.json(result, { status: result.alreadyJoined ? 200 : 201 });
}
