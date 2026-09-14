/**
 * 반 ↔ 봇 짝 찾기 — "수업방 = classrooms 1행 + class_bots 1행" 을 실제 행에서 복원한다.
 *
 * 두 테이블 사이에는 **직접 외래키가 없다**(스키마 불변 — 계약 §0). 짝은 두 곳에 남는다:
 *  1. `join_codes(bot_id, classroom_id, teacher_id)` — 코드를 발급한 반은 여기서 바로 나온다.
 *  2. `enrollments(bot_id, classroom_id)` — 코드 없이 시드된 데모 반(cr_math_a ↔ cb_001)은
 *     참여 행에만 짝이 남아 있다.
 *
 * 그래서 join_codes 를 먼저 보고, 없으면 enrollments 로 떨어진다.
 */

import { and, desc, eq, inArray } from 'drizzle-orm';

import { getDb } from '@/lib/db';
import { classrooms, enrollments, joinCodes } from '@/lib/db/schema';

/** 반 한 칸의 짝 정보. */
export interface ClassroomPair {
  /** 짝지어진 봇 id. */
  botId: string;
  /** 지금 살아 있는 참여 코드(발급 전이면 null). */
  joinCode: string | null;
}

/**
 * 반 id 목록에 대해 짝(봇 id + 참여 코드)을 찾아 준다.
 *
 * @param teacherId - 코드 조회를 이 교사 소유로 제한한다
 * @param classroomIds - 이미 소유권이 확인된 반 id 목록
 * @returns classroomId → 짝. 짝을 못 찾은 반은 키 자체가 없다.
 */
export async function resolveClassroomPairs(
  teacherId: string,
  classroomIds: string[],
): Promise<Map<string, ClassroomPair>> {
  const pairs = new Map<string, ClassroomPair>();
  if (classroomIds.length === 0) return pairs;

  const db = getDb();

  // ① 코드가 있는 반 — 가장 최근 발급본이 그 반의 현재 코드다.
  const codeRows = await db
    .select({
      classroomId: joinCodes.classroomId,
      botId: joinCodes.botId,
      code: joinCodes.code,
    })
    .from(joinCodes)
    .where(
      and(
        eq(joinCodes.teacherId, teacherId),
        inArray(joinCodes.classroomId, classroomIds),
      ),
    )
    .orderBy(desc(joinCodes.createdAt));

  for (const row of codeRows) {
    if (pairs.has(row.classroomId)) continue;
    pairs.set(row.classroomId, { botId: row.botId, joinCode: row.code });
  }

  // ② 코드가 없는 반 — 참여 행에 남은 짝으로 복원(시드 데모 반).
  const enrolledPairs = await db
    .selectDistinct({
      classroomId: enrollments.classroomId,
      botId: enrollments.botId,
    })
    .from(enrollments)
    .where(inArray(enrollments.classroomId, classroomIds));

  for (const row of enrolledPairs) {
    if (pairs.has(row.classroomId)) continue;
    pairs.set(row.classroomId, { botId: row.botId, joinCode: null });
  }

  return pairs;
}

/**
 * 반 한 개를 **소유권까지 조회 조건에 넣어** 읽는다.
 *
 * 경로의 반 id 는 클라이언트 입력이다. 먼저 읽고 나중에 주인을 비교하지 않고
 * `and(id, teacher_id)` 로 **아예 남의 행이 잡히지 않게** 한다 — 0행이면 404 다.
 * 403 으로 답하면 "그 반은 있는데 네 것이 아니다" 를 알려 주는 셈이라 존재가 새 나간다.
 * @param classroomId - 경로 세그먼트의 반 id
 * @param teacherId - 호출자(교사) id
 * @returns 내 반이면 행 + 짝, 아니면(없거나 남의 것이거나) null
 */
export async function loadOwnedClassroom(
  classroomId: string,
  teacherId: string,
): Promise<{
  classroom: typeof classrooms.$inferSelect;
  pair: ClassroomPair | null;
} | null> {
  const [row] = await getDb()
    .select()
    .from(classrooms)
    .where(and(eq(classrooms.id, classroomId), eq(classrooms.teacherId, teacherId)))
    .limit(1);

  if (!row) return null;

  const pairs = await resolveClassroomPairs(teacherId, [classroomId]);
  return { classroom: row, pair: pairs.get(classroomId) ?? null };
}
