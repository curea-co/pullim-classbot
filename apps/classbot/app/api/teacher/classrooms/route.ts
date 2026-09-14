/**
 * 교사 수업방 — 목록 읽기 + 개설 (계약 §4 「교사」).
 *
 * 수업방 하나는 `classrooms` 1행 + `class_bots` 1행 **한 쌍**이다. 개설은 그 두 행과
 * 참여 코드까지 **한 트랜잭션**으로 묶는다 — 반만 생기고 봇이 없거나, 봇은 있는데 코드가
 * 없는 반쪽 상태가 남으면 교사 화면이 그 자리에서 막힌다.
 *
 * 명의(teacherId)는 요청 본문이 아니라 신원 해석기에서만 나온다.
 */

import { randomUUID } from 'node:crypto';
import { NextResponse } from 'next/server';
import { eq, inArray, sql } from 'drizzle-orm';

import { getDb } from '@/lib/db';
import { classBots, classrooms, enrollments, users } from '@/lib/db/schema';
import { issueJoinCode, JoinCodeExhaustedError } from '@/lib/join-code';
import {
  conflict,
  forbidden,
  invalidInput,
  readJsonBody,
  readTrimmed,
  resolveActor,
  unauthorized,
} from '@/app/api/_lib/guards';
import { resolveClassroomPairs } from '@/app/api/_lib/classroom-pair';
import type { TeacherClassroomItem } from '@/app/api/_lib/contract-types';

export const runtime = 'nodejs';

/** 봇 말투 — 스키마 enum 과 같은 목록. 개설 폼에는 없어서 기본값만 쓴다. */
const DEFAULT_TONE = '친근' as const;

/** 소속을 안 주면 이 이름으로 연다. */
const DEFAULT_ORGANIZATION = '풀림';

/**
 * 내가 연 수업방 목록.
 * @param req - 신원(쿠키 또는 Bearer)
 * @returns 200 { classrooms: TeacherClassroomItem[] } | 401 | 403
 */
export async function GET(req: Request): Promise<NextResponse> {
  const actor = await resolveActor(req);
  if (!actor.isIdentified) return unauthorized();
  if (actor.role !== 'teacher') return forbidden('선생님만 볼 수 있어요.');

  const db = getDb();

  // 내 명의 반만 — 소유권 필터가 곧 조회 조건이다.
  const rooms = await db
    .select()
    .from(classrooms)
    .where(eq(classrooms.teacherId, actor.id))
    .orderBy(classrooms.id);

  if (rooms.length === 0) return NextResponse.json({ classrooms: [] });

  const roomIds = rooms.map((r) => r.id);
  const pairs = await resolveClassroomPairs(actor.id, roomIds);

  const botIds = [...new Set([...pairs.values()].map((p) => p.botId))];
  const bots = botIds.length
    ? await db
        .select({
          id: classBots.id,
          name: classBots.name,
          subject: classBots.subject,
          grade: classBots.grade,
          // 게시 상태 — 카드의 배지·토글이 읽는다. 마켓 목록을 따로 받지 않아도 되게.
          isPublished: classBots.isPublished,
          publishedAt: classBots.publishedAt,
          publishBlurb: classBots.publishBlurb,
        })
        .from(classBots)
        .where(inArray(classBots.id, botIds))
    : [];
  const botById = new Map(bots.map((b) => [b.id, b]));

  // 참여 인원은 반 기준으로 센다(같은 반의 봇 참여 행 수 = 학생 수).
  const countRows = await db
    .select({
      classroomId: enrollments.classroomId,
      count: sql<number>`count(*)::int`,
    })
    .from(enrollments)
    .where(inArray(enrollments.classroomId, roomIds))
    .groupBy(enrollments.classroomId);
  const countByRoom = new Map(countRows.map((r) => [r.classroomId, r.count]));

  const items: TeacherClassroomItem[] = rooms.map((room) => {
    const pair = pairs.get(room.id) ?? null;
    const bot = pair ? botById.get(pair.botId) : undefined;
    return {
      classroomId: room.id,
      label: room.label,
      organization: room.organization,
      botId: pair?.botId ?? null,
      botName: bot?.name ?? null,
      subject: bot?.subject ?? null,
      grade: bot?.grade ?? null,
      studentCount: countByRoom.get(room.id) ?? 0,
      joinCode: pair?.joinCode ?? null,
      // 짝 봇이 없는 반은 게시할 대상 자체가 없다 — 「안 걸림」이지 오류가 아니다.
      isPublished: bot?.isPublished ?? false,
      publishedAt: bot?.publishedAt?.toISOString() ?? null,
      publishBlurb: bot?.publishBlurb ?? null,
    };
  });

  return NextResponse.json({ classrooms: items });
}

/**
 * 수업방을 연다 — 반 + 봇 + 참여 코드를 한 번에.
 * @param req - body `{ label, subject, grade, organization?, botName? }`
 * @returns 201 { classroom, bot, joinCode } | 400 | 401 | 403 | 409
 */
export async function POST(req: Request): Promise<NextResponse> {
  const actor = await resolveActor(req);
  if (!actor.isIdentified) return unauthorized();
  if (actor.role !== 'teacher') return forbidden('선생님만 수업방을 열 수 있어요.');

  const body = await readJsonBody(req);
  if (!body) return invalidInput('요청 본문을 읽지 못했어요.');

  const label = readTrimmed(body.label);
  const subject = readTrimmed(body.subject);
  const grade = readTrimmed(body.grade);
  if (!label) return invalidInput('수업방 이름을 적어 주세요.');
  if (!subject) return invalidInput('과목을 골라 주세요.');
  if (!grade) return invalidInput('학년을 골라 주세요.');

  const db = getDb();

  const [teacher] = await db
    .select({ name: users.name })
    .from(users)
    .where(eq(users.id, actor.id))
    .limit(1);
  const teacherName = teacher?.name ?? '선생님';

  // 소속은 본문 → 내가 이미 연 반의 소속 → 기본값 순으로 채운다.
  const bodyOrganization = readTrimmed(body.organization);
  let organization = bodyOrganization;
  if (!organization) {
    const [existing] = await db
      .select({ organization: classrooms.organization })
      .from(classrooms)
      .where(eq(classrooms.teacherId, actor.id))
      .limit(1);
    organization = existing?.organization ?? DEFAULT_ORGANIZATION;
  }

  const botName = readTrimmed(body.botName) || `${subject} 도우미`;

  // 라이브 데이터와 같은 규약 — 읽기 쉬운 접두사 + uuid.
  const classroomId = `cr_${randomUUID()}`;
  const botId = `cb_${randomUUID()}`;

  try {
    const created = await db.transaction(async (tx) => {
      const [classroom] = await tx
        .insert(classrooms)
        .values({ id: classroomId, label, organization, teacherId: actor.id })
        .returning();

      const [bot] = await tx
        .insert(classBots)
        .values({
          id: botId,
          name: botName,
          teacherId: actor.id,
          teacherName,
          organization,
          subject,
          grade,
          tone: DEFAULT_TONE,
          greeting: `안녕! ${subject} 같이 해보자.`,
        })
        .returning();

      // teacherId 필수 — NULL 이면 복합 FK(MATCH SIMPLE)가 소유권을 검사하지 않는다.
      const joinCode = await issueJoinCode(tx, {
        botId,
        classroomId,
        teacherId: actor.id,
      });

      return { classroom, bot, joinCode };
    });

    return NextResponse.json(created, { status: 201 });
  } catch (error) {
    if (error instanceof JoinCodeExhaustedError) {
      return conflict(error.message);
    }
    // FK 위반 등 쓰기 실패 — 정본 라우트와 같게 400 으로 답한다(500 을 흘리지 않는다).
    // 트랜잭션이라 세 행 중 하나라도 실패하면 전부 없던 일이 된다(반쪽 수업방 없음).
    return invalidInput('수업방을 만들지 못했어요.');
  }
}
