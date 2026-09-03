/**
 * 수업방·참여 코드·과제 흐름을 **손으로 확인하기 위한** 데모 상태 리셋.
 *
 * `db:seed` 와 다르다 — seed 는 30개 테이블을 TRUNCATE 하고 mock 전체를 다시 넣는다.
 * 이 스크립트는 **이번 흐름이 쓰는 것만** 정해진 출발점으로 되돌린다:
 *   - 교사가 연 수업방과 그 참여 코드
 *   - 학생 민준(s2)의 참여
 *   - 교사가 낸 과제(created_by 가 있는 행)
 * 서연(student_001)의 기존 5개 반과 과제 3건, 그리고 mock 시드가 만든 나머지 데이터는
 * **건드리지 않는다.** 그래야 기존 화면들이 계속 살아 있다.
 *
 * 실행: `bun run demo:reset`  (apps/classbot 에서, 또는 --filter 로)
 *
 * 만들어지는 출발점 (아래 시나리오와 짝):
 *   김수학 teacher_001 — 고2 미적분 A반(서연 참여) · 고2 미적분 B반(빈 방, 과제 1건 이미 출제)
 *   박영어 teacher_002 — 고2 영어독해 C반(빈 방)
 *   민준  s2          — 참여 0곳   ← 코드 참여를 맨바닥부터 해 보기 위한 자리
 *
 * 이 상태에서 민준으로 B반 코드를 넣으면 **참여 직후 받은 과제에 과제가 나타난다.**
 */

import { config as loadEnv } from 'dotenv';

loadEnv({ path: '.env.local' });
loadEnv({ path: '.env' });

import { and, eq, isNotNull, sql } from 'drizzle-orm';
import { randomUUID } from 'node:crypto';

import { getDb, getPool } from '../lib/db';
import {
  assignments,
  consentLogs,
  parentChildLinks,
  classBots,
  classrooms,
  enrollments,
  joinCodes,
  users,
} from '../lib/db/schema';
import { formatJoinCode } from '../lib/join-code-format';
import { issueJoinCode } from '../lib/join-code';

/** 이 스크립트가 소유하는 수업방 — 매 실행마다 지웠다 다시 만든다. */
interface DemoRoom {
  key: string;
  teacherId: string;
  label: string;
  organization: string;
  subject: string;
  grade: string;
  botName: string;
  /** 이 방에 반 전체 대상 과제를 하나 미리 내 둘지 */
  seedAssignment?: { title: string; dueLabel: string; dDay: string; questionCount: number };
}

const DEMO_ROOMS: DemoRoom[] = [
  {
    key: 'math_b',
    teacherId: 'teacher_001',
    label: '고2 미적분 B반',
    organization: '대치프리미엄 수학학원',
    subject: '수학Ⅱ',
    grade: '고2',
    botName: '수학Ⅱ 도우미',
    seedAssignment: {
      title: '미적분 B반 1주차 과제',
      dueLabel: '이번 주 일요일까지',
      dDay: 'D-5',
      questionCount: 8,
    },
  },
  {
    key: 'eng_c',
    teacherId: 'teacher_002',
    label: '고2 영어독해 C반',
    organization: '대치프리미엄 영어학원',
    subject: '영어',
    grade: '고2',
    botName: '영어 도우미',
  },
];

/** 기존 시드 수업방 중 코드를 하나 쥐어 줄 곳 — 「이미 학생이 있는 반」 예시. */
const SEEDED_ROOM_WITH_CODE = { classroomId: 'cr_math_a', botId: 'cb_001', teacherId: 'teacher_001' };

async function main(): Promise<void> {
  const db = getDb();

  // ── 1. 지난 실행이 남긴 것을 걷는다 ───────────────────────────────
  // 교사가 낸 과제만 지운다(created_by 가 채워진 행). mock 시드 과제는 created_by 가 비어 있어 살아남는다.
  const removedAssignments = await db
    .delete(assignments)
    .where(isNotNull(assignments.createdBy))
    .returning({ id: assignments.id });

  // 민준의 참여를 비운다 — 코드 참여를 맨바닥부터 해 보기 위한 자리다.
  await db.delete(enrollments).where(eq(enrollments.studentId, 's2'));

  // 런타임에 만들어진 수업방을 전부 지운다 — 이 스크립트가 만든 것도, 손으로 만들어 본 것도.
  //
  // 라벨이 아니라 **id 모양**으로 가른다. 시드 수업방은 `cr_math_a` 처럼 사람이 붙인 id 이고
  // 화면·API 로 만든 것은 `cr_<uuid>` 다. 라벨로 지우면 테스트하다 만든 「1학년 3반」 같은
  // 방이 계속 쌓여, 다음 사람이 어느 게 데모 데이터인지 알 수 없게 된다.
  // join_codes 는 classrooms 에 걸린 FK 가 cascade 라 함께 사라진다.
  const staleRooms = await db
    .delete(classrooms)
    .where(sql`${classrooms.id} ~ '^cr_[0-9a-f]{8}-'`)
    .returning({ id: classrooms.id });

  // 짝 봇도 같은 기준으로. 단 **아무도 참여·출제하지 않은 것만** — 시드 봇(cb_001…)은
  // 애초에 id 모양이 걸리지 않고, 실제로 쓰인 런타임 봇은 남겨 데이터를 깨지 않는다.
  const staleBots = await db
    .delete(classBots)
    .where(
      and(
        sql`${classBots.id} ~ '^cb_[0-9a-f]{8}-'`,
        sql`${classBots.id} not in (select distinct bot_id from ${enrollments})`,
        sql`${classBots.id} not in (select distinct bot_id from ${assignments})`,
      ),
    )
    .returning({ id: classBots.id });

  // 게시 상태를 전부 내린다 — 마켓도 정해진 출발점에서 시작해야 한다.
  // (아래에서 시드 봇 하나만 다시 올려 「빈 마켓이 아닌」 상태를 만든다.)
  await db
    .update(classBots)
    .set({ isPublished: false, publishedAt: null })
    .where(eq(classBots.isPublished, true));

  // ── 2. 데모 수업방을 새로 연다 ────────────────────────────────────
  const created: Array<{ room: DemoRoom; code: string }> = [];

  for (const room of DEMO_ROOMS) {
    const [teacher] = await db.select().from(users).where(eq(users.id, room.teacherId)).limit(1);
    if (!teacher) {
      throw new Error(
        `[demo-reset] 교사 ${room.teacherId} 가 DB 에 없습니다. 먼저 \`bun run db:seed\` 로 기본 데이터를 넣으세요.`,
      );
    }
    const teacherName = `${teacher.name} 선생님`;

    const classroomId = `cr_${randomUUID()}`;
    const botId = `cb_${randomUUID()}`;

    await db.insert(classBots).values({
      id: botId,
      name: room.botName,
      teacherId: room.teacherId,
      teacherName,
      organization: room.organization,
      subject: room.subject,
      grade: room.grade,
      tone: '친근',
      greeting: `안녕! 나는 ${room.botName}야. 모르는 게 있으면 언제든 물어봐.`,
    });

    await db.insert(classrooms).values({
      id: classroomId,
      label: room.label,
      organization: room.organization,
      teacherId: room.teacherId,
    });

    const code = await issueJoinCode(db, { botId, classroomId, teacherId: room.teacherId });
    created.push({ room, code });

    if (room.seedAssignment) {
      const a = room.seedAssignment;
      await db.insert(assignments).values({
        id: `as_${randomUUID()}`,
        botId,
        studentId: null,
        title: a.title,
        scope: `${room.subject} 기본`,
        subject: room.subject,
        grade: room.grade,
        chapterFrom: '1단원',
        chapterTo: '2단원',
        questionCount: a.questionCount,
        difficulty: '중',
        mode: 'practice',
        source: 'teacher-assigned',
        assignedBy: teacherName,
        assignedAtLabel: '방금',
        dueLabel: a.dueLabel,
        dDay: a.dDay,
        state: 'todo',
        solveHref: '#',
        targetStudentIds: [],
        dispatchStatus: 'sent',
        createdBy: room.teacherId,
        dispatchedAt: new Date(),
      });
    }
  }

  // ── 3. 기존 시드 반에도 코드를 하나 쥐어 준다 ─────────────────────
  // 「학생이 이미 있는 반」에서 코드 재발급을 눌러 보기 위한 자리.
  await db.delete(joinCodes).where(eq(joinCodes.classroomId, SEEDED_ROOM_WITH_CODE.classroomId));
  const seededCode = await issueJoinCode(db, SEEDED_ROOM_WITH_CODE);

  // ── 3.4 학부모 — 자녀 둘, 동의는 아무것도 없음 ────────────────────
  //
  // 자녀를 둘로 두는 이유: 학부모 화면의 핵심 케이스가 「한 자녀는 공유, 한 자녀는 미공유」다.
  // 그 상태를 우연에 맡기면 재현이 안 된다.
  //
  // 동의는 **비워 두고 시작한다.** 이 화면의 전제는 「자녀가 주지 않으면 안 보인다」이고,
  // 그게 실제로 작동하는지 보려면 출발점이 미동의여야 한다. 학생 화면에서 직접 켜 보게 한다.
  await db
    .insert(parentChildLinks)
    .values([
      { parentId: 'parent_001', studentId: 'student_001', relation: 'mother', primary: true },
      { parentId: 'parent_001', studentId: 's2', relation: 'mother', primary: false },
    ])
    .onConflictDoNothing();
  await db.delete(consentLogs).where(eq(consentLogs.parentId, 'parent_001'));

  // ── 3.5 마켓 예시 하나 ────────────────────────────────────────────
  // 빈 마켓만 보면 「게시가 되긴 하나」를 알 수 없다. 시드 봇 하나를 올려 두고,
  // 교사가 직접 올리고 내리는 것은 화면에서 해 보게 한다.
  await db
    .update(classBots)
    .set({
      isPublished: true,
      publishedAt: new Date(),
      publishBlurb: '미적분 개념부터 킬러 문항까지, 한 문제씩 같이 뜯어봐요.',
    })
    .where(eq(classBots.id, SEEDED_ROOM_WITH_CODE.botId));

  // ── 4. 결과를 사람이 읽게 찍는다 ──────────────────────────────────
  const line = '─'.repeat(58);
  console.log(`\n${line}`);
  console.log('  데모 상태를 새로 맞췄습니다');
  console.log(line);
  console.log(`  지운 것 — 교사 출제 과제 ${removedAssignments.length}건 · 데모 수업방 ${staleRooms.length}개 · 봇 ${staleBots.length}개 · 민준의 참여 전부`);
  console.log('');
  console.log('  교사 · 김수학 (teacher_001)');
  console.log(`    고2 미적분 A반   ${formatJoinCode(seededCode)}   서연 참여 중`);
  for (const { room, code } of created.filter((c) => c.room.teacherId === 'teacher_001')) {
    const mark = room.seedAssignment ? `과제 1건 대기 — 「${room.seedAssignment.title}」` : '빈 방';
    console.log(`    ${room.label}   ${formatJoinCode(code)}   ${mark}`);
  }
  console.log('');
  console.log('  교사 · 박영어 (teacher_002)');
  for (const { room, code } of created.filter((c) => c.room.teacherId === 'teacher_002')) {
    console.log(`    ${room.label}   ${formatJoinCode(code)}   빈 방`);
  }
  console.log('');
  console.log('  봇 마켓   공유된 봇 1개 — 수학이 형 (교사 화면에서 공유하고 그만둬 보세요)');
  console.log('');
  console.log('  학부모 · 어머니   자녀 둘(서연·민준) · 동의 0건 ← 학생 화면에서 켜 보세요');
  console.log('');
  console.log('  학생 · 민준 (s2)   참여 0곳  ← 여기서 코드를 넣어 보세요');
  console.log('  학생 · 서연 (student_001)   기존 5개 반 · 과제 3건 그대로');
  console.log(line);
  console.log('  헤더의 dev 렌치 버튼에서 계정을 바꿔 가며 확인하세요.\n');
}

main()
  .catch((error: unknown) => {
    console.error('[demo-reset] 실패:', error);
    process.exitCode = 1;
  })
  .finally(() => {
    void getPool().end();
  });
