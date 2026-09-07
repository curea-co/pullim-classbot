/**
 * 수업방·참여 코드·과제 흐름을 **손으로 확인하기 위한** 데모 상태 리셋.
 *
 * `db:seed` 와 다르다 — seed 는 30개 테이블을 TRUNCATE 하고 mock 전체를 다시 넣는다.
 * 이 스크립트는 **자기가 만든 것만** 정해진 출발점으로 되돌린다. 가르는 기준은 하나 —
 * **`*_demo_` id 접두사**다(`cr_demo_` · `cb_demo_` · `as_demo_`):
 *   - 이 스크립트가 연 수업방과 그 참여 코드
 *   - 이 스크립트가 만든 봇 (아무도 참여·출제하지 않은 것만)
 *   - 이 스크립트가 낸 과제
 *   - 학생 민준(s2)의 참여 — 코드 참여를 맨바닥부터 해 보기 위한 자리다
 *   - 게시 상태는 **자기 봇과 아래에서 자기가 올리는 시드 봇 하나**만 내린다
 * 서연(student_001)의 기존 5개 반과 과제 3건, mock 시드가 만든 나머지 데이터, 그리고
 * **사람이 화면·API 로 만든 수업방·봇·과제와 그들이 올린 마켓 게시**는 **건드리지 않는다.**
 * 그래야 기존 화면들이 계속 살아 있고, 데모를 한 번 돌려 본 대가로 남의 작업이 사라지지 않는다.
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

import { and, eq, isNotNull, or, sql } from 'drizzle-orm';
import { getDb, getPool } from '../lib/db';
import {
  assignments,
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

/**
 * 이 스크립트가 만든 과제임을 밝히는 id 접두사 — **삭제 대상을 정하는 유일한 표식**이다.
 *
 * `created_by` 로는 가를 수 없다(발사 라우트가 항상 채운다). 수업방·봇처럼 `<uuid>` 모양으로도
 * 못 가른다(런타임 과제도 `as_<uuid>` 다). 그래서 데모 과제만 id 를 **결정적으로** 짓는다.
 */
const DEMO_ASSIGNMENT_ID_PREFIX = 'as_demo_';

/**
 * 수업방·봇에도 같은 표식을 쓴다.
 *
 * 예전에는 `cr_<uuid>` 정규식으로 「런타임에 만들어진 것」을 통째로 지웠다. 그 조건은 이
 * 스크립트가 만든 방만이 아니라 **교사가 화면에서 만든 방 전부**에 걸리고, 참여 코드와
 * enrollment 까지 cascade 로 함께 지운다. 머리주석의 「사람이 화면·API 로 낸 것은 건드리지
 * 않는다」와 정면으로 어긋나던 자리다.
 */
const DEMO_CLASSROOM_ID_PREFIX = 'cr_demo_';
const DEMO_BOT_ID_PREFIX = 'cb_demo_';

/**
 * 데모 수업방·봇 id — 방 key 로 결정된다(매 실행 같은 id).
 * @param roomKey - `DEMO_ROOMS` 의 key
 * @returns `cr_demo_<key>` · `cb_demo_<key>`
 */
function demoClassroomId(roomKey: string): string {
  return `${DEMO_CLASSROOM_ID_PREFIX}${roomKey}`;
}
function demoBotId(roomKey: string): string {
  return `${DEMO_BOT_ID_PREFIX}${roomKey}`;
}

/**
 * 데모 과제 id — 방 key 로 결정된다(매 실행 같은 id).
 * @param roomKey - `DEMO_ROOMS` 의 key
 * @returns `as_demo_<key>`
 */
function demoAssignmentId(roomKey: string): string {
  return `${DEMO_ASSIGNMENT_ID_PREFIX}${roomKey}`;
}

/** 기존 시드 수업방 중 코드를 하나 쥐어 줄 곳 — 「이미 학생이 있는 반」 예시. */
const SEEDED_ROOM_WITH_CODE = { classroomId: 'cr_math_a', botId: 'cb_001', teacherId: 'teacher_001' };

async function main(): Promise<void> {
  const db = getDb();

  // ── 1. 지난 실행이 남긴 것을 걷는다 ───────────────────────────────
  // **이 스크립트가 만든 과제만** 지운다 — id 접두사가 그 표식이다.
  //
  // 예전에는 `created_by IS NOT NULL` 로 골랐다. 그건 「교사가 낸 과제」를 고르는 조건이
  // 아니라 **API 로 발사된 모든 과제**를 고르는 조건이다 —
  // `POST /api/teacher/assignments` 는 발사 교사를 항상 `created_by` 에 적는다
  // (제출 현황 접근 검증의 권위라서 비워 둘 수가 없다). 그래서 데모를 한 번 확인하려고
  // 이 스크립트를 돌리면 **사람이 화면에서 낸 과제가 통째로 사라졌다.**
  //
  // 시드 과제와 런타임 과제가 `as_<uuid>` 로 id 모양까지 같아서, 수업방·봇처럼 모양으로도
  // 가를 수 없다. 그래서 **소유 표식을 명시적으로 박는다**(아래 `demoAssignmentId`).
  const removedAssignments = await db
    .delete(assignments)
    .where(sql`${assignments.id} like ${`${DEMO_ASSIGNMENT_ID_PREFIX}%`}`)
    .returning({ id: assignments.id });

  // 남겨 둔 것을 세어 사람에게 보여 준다 — 「왜 내 과제가 그대로지」를 묻지 않게.
  const [keptRow] = await db
    .select({ n: sql<number>`count(*)::int` })
    .from(assignments)
    .where(
      and(
        isNotNull(assignments.createdBy),
        sql`${assignments.id} not like ${`${DEMO_ASSIGNMENT_ID_PREFIX}%`}`,
      ),
    );
  const keptTeacherAssignments = keptRow?.n ?? 0;

  // 민준의 참여를 비운다 — 코드 참여를 맨바닥부터 해 보기 위한 자리다.
  await db.delete(enrollments).where(eq(enrollments.studentId, 's2'));

  // 지난 실행의 데모 수업방을 지운다 — **접두사가 붙은 것만**.
  //
  // 예전에는 `cr_<uuid>` 정규식이라 「런타임에 만들어진 것」을 통째로 걷었다. 그건 이
  // 스크립트가 만든 방만이 아니라 **교사가 화면에서 만든 방 전부**에 걸리고, 참여 코드와
  // enrollment 까지 cascade 로 끌고 간다. 데모를 한 번 돌린 대가로 남의 반이 사라졌다.
  // join_codes 는 classrooms 에 걸린 FK 가 cascade 라 데모 방의 코드만 함께 사라진다.
  const staleRooms = await db
    .delete(classrooms)
    .where(sql`${classrooms.id} like ${`${DEMO_CLASSROOM_ID_PREFIX}%`}`)
    .returning({ id: classrooms.id });

  // 짝 봇도 같은 표식으로. 단 **아무도 참여·출제하지 않은 것만** — 사람이 그 데모 봇에
  // 과제를 냈거나 학생이 들어와 있으면 남겨서 그 데이터를 깨지 않는다.
  const staleBots = await db
    .delete(classBots)
    .where(
      and(
        sql`${classBots.id} like ${`${DEMO_BOT_ID_PREFIX}%`}`,
        sql`${classBots.id} not in (select distinct bot_id from ${enrollments})`,
        sql`${classBots.id} not in (select distinct bot_id from ${assignments})`,
      ),
    )
    .returning({ id: classBots.id });

  // 게시 상태를 내린다 — **이 스크립트가 건드리는 봇만.**
  //
  // 예전에는 `where(isPublished = true)` 라 **모든 봇**의 게시를 내렸다. 교사가 실제로 마켓에
  // 올려 둔 봇까지 조용히 내려가던 자리다. 데모가 출발점으로 되돌릴 대상은 자기가 만든 봇과
  // 아래에서 자기가 올리는 시드 봇 하나뿐이다.
  await db
    .update(classBots)
    .set({ isPublished: false, publishedAt: null })
    .where(
      and(
        eq(classBots.isPublished, true),
        or(
          sql`${classBots.id} like ${`${DEMO_BOT_ID_PREFIX}%`}`,
          eq(classBots.id, SEEDED_ROOM_WITH_CODE.botId),
        ),
      ),
    );

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

    const classroomId = demoClassroomId(room.key);
    const botId = demoBotId(room.key);

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
        id: demoAssignmentId(room.key),
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
  console.log(`  지운 것 — 데모 과제 ${removedAssignments.length}건 · 데모 수업방 ${staleRooms.length}개 · 봇 ${staleBots.length}개 · 민준의 참여 전부`);
  if (keptTeacherAssignments > 0) {
    console.log(`  그대로 둔 것 — 사람이 낸 과제 ${keptTeacherAssignments}건 (이 스크립트는 자기가 만든 것만 지웁니다)`);
  }
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
