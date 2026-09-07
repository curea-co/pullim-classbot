/**
 * 수업방·참여 코드·과제 흐름을 **손으로 확인하기 위한** 데모 상태 리셋.
 *
 * `db:seed` 와 다르다 — seed 는 30개 테이블을 TRUNCATE 하고 mock 전체를 다시 넣는다.
 * 이 스크립트는 **자기가 만든 것만** 정해진 출발점으로 되돌린다. 가르는 기준은 하나 —
 * **`*_demo_` id 접두사**다(`cr_demo_` · `cb_demo_` · `as_demo_`):
 *   - 이 스크립트가 낸 과제 — 지운다
 *   - 이 스크립트가 연 수업방의 참여 코드 — 지우고 새로 뽑는다
 *   - 학생 민준(s2)이 **데모 방에** 넣어 둔 참여 — 비운다. 코드 참여를 맨바닥부터 해 보기
 *     위한 자리다. 민준은 시드 사용자라 이 스크립트의 소유물이 아니므로, 데모 밖 참여는
 *     그대로 두고 출력이 그 사실을 말한다
 *   - 데모 수업방·봇 행 자체 — **지우지 않고 덮어쓴다**(upsert). id 가 결정적이라
 *     지웠다 다시 만들면 남이 쓰던 봇에서 PK 충돌이 나고, 방을 먼저 지우면 그 cascade 가
 *     보존하려던 학생 참여를 먼저 지운다. 자세한 근거는 아래 해당 자리 주석에 있다
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

/**
 * 코드 참여를 맨바닥부터 해 보는 학생. 시드 사용자라 **이 스크립트의 소유물이 아니다** —
 * 그래서 이 학생의 참여도 데모 방에 들어간 것만 건드린다.
 */
const DEMO_STUDENT_ID = 's2';

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

  /*
    민준의 참여를 비운다 — 코드 참여를 맨바닥부터 해 보기 위한 자리다.
    단 **데모 방에 들어간 것만** 지운다.

    예전에는 `student_id = 's2'` 한 줄이었다. 그런데 `s2` 는 이 스크립트가 만든 표식이 아니라
    시드 사용자다. 그 조건은 민준이 화면·API 로 **다른 수업방**에 들어가 둔 참여까지 지워서,
    데모를 한 번 돌린 대가로 사람이 만들어 둔 수업 접근권이 사라졌다 — 머리말의 「사람이
    만든 것은 건드리지 않는다」와 어긋나던 마지막 자리다.

    그래서 데모 방(`cr_demo_*`)의 참여로 좁힌다. 대신 「참여 0곳」을 장담할 수 없게 되므로,
    아래 출력이 **남은 참여를 세어 사실대로** 말한다.
  */
  await db
    .delete(enrollments)
    .where(
      and(
        eq(enrollments.studentId, DEMO_STUDENT_ID),
        sql`${enrollments.classroomId} like ${`${DEMO_CLASSROOM_ID_PREFIX}%`}`,
      ),
    );

  // 데모 밖에 남은 민준의 참여 — 지우지 않았으니 사실대로 알린다.
  const [demoStudentRow] = await db
    .select({ n: sql<number>`count(*)::int` })
    .from(enrollments)
    .where(eq(enrollments.studentId, DEMO_STUDENT_ID));
  const demoStudentEnrollments = demoStudentRow?.n ?? 0;

  /*
    데모 수업방·봇은 **지우지 않는다. 덮어쓴다.**

    id 를 결정적으로 지으면서(`cr_demo_*` · `cb_demo_*`) 「지웠다 다시 만든다」가 성립하지
    않게 됐다. 두 가지가 한꺼번에 어긋났다:

      ① 사람이 데모 봇에 과제를 냈으면 봇 보존 조건(`not in (select bot_id from assignments)`)이
         그 봇을 남긴다. 그런데 아래에서 **같은 id 로 다시 INSERT** 하므로 PK 충돌로 리셋이
         통째로 죽는다. id 가 uuid 이던 시절에는 없던 고장이다.
      ② 학생이 데모 방에 들어와 있으면, 방을 먼저 지우는 순간 그 cascade 가 enrollment 를
         먼저 없앤다. 그러면 봇 보존 조건이 「아무도 안 쓴다」로 바뀌어 **보존하려던 봇과
         학생 참여를 함께 지운다.** 보호 장치가 자기 앞의 삭제에 무력화된 것이다.

    삭제 순서를 손보는 대신 **삭제를 없앤다.** 되돌릴 것은 이 스크립트가 소유한 것 —
    데모 과제와 데모 참여 코드 — 이고, 그 둘은 아래에서 따로 지운다. 수업방·봇 행 자체는
    `onConflictDoUpdate` 로 정해진 모양에 맞추기만 하면 된다. 그러면 재실행이 언제나
    성공하고(멱등), 남의 과제·남의 참여는 어느 경우에도 사라지지 않는다.
  */
  // 데모 짝의 옛 참여 코드는 지운다 — 재발급이 곧 무효화다(방을 안 지우니 cascade 도 없다).
  for (const room of DEMO_ROOMS) {
    await db
      .delete(joinCodes)
      .where(eq(joinCodes.classroomId, demoClassroomId(room.key)));
  }

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

    const botFields = {
      name: room.botName,
      teacherId: room.teacherId,
      teacherName,
      organization: room.organization,
      subject: room.subject,
      grade: room.grade,
      tone: '친근' as const,
      greeting: `안녕! 나는 ${room.botName}야. 모르는 게 있으면 언제든 물어봐.`,
    };
    // 있으면 정해진 모양으로 맞추고, 없으면 만든다 — 재실행이 언제나 성공한다.
    await db
      .insert(classBots)
      .values({ id: botId, ...botFields })
      .onConflictDoUpdate({ target: classBots.id, set: botFields });

    const roomFields = {
      label: room.label,
      organization: room.organization,
      teacherId: room.teacherId,
    };
    await db
      .insert(classrooms)
      .values({ id: classroomId, ...roomFields })
      .onConflictDoUpdate({ target: classrooms.id, set: roomFields });

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
  console.log(`  되돌린 것 — 데모 과제 ${removedAssignments.length}건 · 데모 수업방 ${DEMO_ROOMS.length}개(코드 재발급) · 민준의 데모 방 참여`);
  if (keptTeacherAssignments > 0) {
    console.log(`  그대로 둔 것 — 사람이 낸 과제 ${keptTeacherAssignments}건 (이 스크립트는 자기가 만든 것만 되돌립니다)`);
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
  const minjun =
    demoStudentEnrollments === 0
      ? '참여 0곳  ← 여기서 코드를 넣어 보세요'
      : `데모 밖 참여 ${demoStudentEnrollments}곳 그대로 (사람이 넣은 것이라 안 지웁니다)`;
  console.log(`  학생 · 민준 (s2)   ${minjun}`);
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
