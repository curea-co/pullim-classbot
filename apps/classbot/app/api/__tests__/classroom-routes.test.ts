/**
 * @jest-environment node
 *
 * 수업방 라우트 가드 단위 테스트 (계약 §4).
 *
 * 여기서 지키려는 것 셋:
 *  1. **소유권** — 남의 반 id 를 경로에 넣으면 **404**(403 이 아니다). 403 으로 답하면
 *     "그 반은 있는데 네 것이 아니다" 를 알려 주는 셈이라 남의 반 존재가 새 나간다.
 *     역할 불일치(학생이 교사 라우트)만 403 `FORBIDDEN_ROLE` 이다.
 *  2. **넓힌 학생 술어** — 반 단위 발사(student_id NULL)가 학생 조회에 들어온다.
 *     술어(`visibleAssignmentsWhere`)는 `/api/parent/children` 이 아직 쓴다.
 *  3. **교사 반 목록** — 카드가 게시 상태를 함께 들고 온다(봇 마켓 「내 봇 공유」가 읽는다).
 *
 * DB 는 mock 이라 실 Postgres 없이 **가드 순서와 조립된 SQL** 만 본다.
 *
 * 종전에는 과제 발사·고치기(`/api/teacher/assignments*`) · 코드 참여(`/api/enrollments`) ·
 * 내 수업방(`/api/me/classrooms`)도 같이 봤다 — 그 라우트 셋은 계획 PR 8 에서 걷혔다
 * (정본은 pullim-api `POST /classes/:id/assignments` · `POST /enrollments` · `GET /bots?role=student`).
 */
import { PgDialect } from 'drizzle-orm/pg-core';

// ── getDb mock — select/insert/update/delete/transaction 체인을 가짜로 대체 ──
const whereSpy = jest.fn();
const setSpy = jest.fn();
/** `SELECT ... FOR UPDATE` 호출 기록 — 잠금을 실제로 거는지 본다. */
const forSpy = jest.fn();
const insertValuesSpy = jest.fn();
const deleteSpy = jest.fn();

/** 다음 `select` 들이 차례로 돌려줄 행 묶음(호출 순서대로 shift). */
let mockSelectQueue: unknown[][] = [];
/** 다음 `insert ... returning` 들이 차례로 돌려줄 행 묶음. */
let mockInsertQueue: unknown[][] = [];
let mockUpdateQueue: unknown[][] = [];

jest.mock('@/lib/db', () => {
  type Chain = Record<string, unknown>;

  const selectChain = (): Chain => {
    const chain: Chain = {};
    const ret = () => chain;
    chain.from = ret;
    chain.innerJoin = ret;
    chain.leftJoin = ret;
    chain.groupBy = ret;
    chain.orderBy = ret;
    chain.limit = ret;
    chain.where = (...args: unknown[]) => {
      whereSpy(...args);
      return chain;
    };
    chain.for = (...args: unknown[]) => {
      forSpy(...args);
      return chain;
    };
    chain.then = (resolve: (v: unknown[]) => unknown) =>
      resolve(mockSelectQueue.shift() ?? []);
    return chain;
  };

  const insertChain = (): Chain => {
    const chain: Chain = {};
    chain.values = (v: unknown) => {
      insertValuesSpy(v);
      return chain;
    };
    chain.onConflictDoNothing = () => chain;
    chain.returning = () => chain;
    chain.then = (resolve: (v: unknown[]) => unknown) =>
      resolve(mockInsertQueue.shift() ?? []);
    return chain;
  };

  const updateChain = (): Chain => {
    const chain: Chain = {};
    chain.set = (v: unknown) => {
      setSpy(v);
      return chain;
    };
    chain.where = () => chain;
    // `.returning()` 을 쓰는 라우트(낸 과제 PATCH)가 있어 체인에 둔다. 큐가 비면 0행 —
    // 소유권이 안 맞아 아무것도 안 고쳐진 경우와 같은 모양이다.
    chain.returning = () => chain;
    chain.then = (resolve: (v: unknown[]) => unknown) => resolve(mockUpdateQueue.shift() ?? []);
    return chain;
  };

  const deleteChain = (): Chain => {
    const chain: Chain = {};
    chain.where = () => chain;
    chain.then = (resolve: (v: unknown[]) => unknown) => resolve([]);
    return chain;
  };

  const makeDb = (): Chain => ({
    select: () => selectChain(),
    selectDistinct: () => selectChain(),
    insert: () => insertChain(),
    update: () => updateChain(),
    delete: () => {
      deleteSpy();
      return deleteChain();
    },
    transaction: (fn: (tx: unknown) => Promise<unknown>) => fn(makeDb()),
  });

  return { getDb: () => makeDb() };
});

import { POST as issueCode } from '@/app/api/teacher/classrooms/[id]/join-codes/route';
import { GET as getStudents } from '@/app/api/teacher/classrooms/[id]/students/route';
import {
  GET as getClassrooms,
  POST as createClassroom,
} from '@/app/api/teacher/classrooms/route';
import { GET as getParentChildren } from '@/app/api/parent/children/route';
import { visibleAssignmentsWhere } from '@/app/api/_lib/assignment-visibility';
import type { TeacherClassroomItem } from '@/app/api/_lib/contract-types';

beforeEach(() => {
  whereSpy.mockClear();
  setSpy.mockClear();
  forSpy.mockClear();
  insertValuesSpy.mockClear();
  deleteSpy.mockClear();
  mockSelectQueue = [];
  mockInsertQueue = [];
  mockUpdateQueue = [];
});

/**
 * 개발용 신원이 인정되는 호스트 — `lib/dev-identity.ts` 허용 목록 안의 이름이다.
 *
 * **명시해야 한다.** `new Request(url)` 은 `Host` 헤더를 만들어 주지 않아
 * `req.headers.get('host')` 가 `null` 이고, 신원 판정은 **모르면 닫는다**(fail-closed).
 */
const DEV_HOST = 'localhost:3032';

/**
 * 개발용 신원 쿠키를 실은 요청.
 *
 * 역할은 **인자로 받지 않는다** — 쿠키 값(= allowlist 의 id)이 역할을 정하고, 그 위에서
 * `resolveActor` 가 도메인 `users.role` 로 다시 판정한다. 종전 픽스처는 JWT claim 에
 * role 을 실었지만 그 값은 이미 권위가 아니었다(테스트 이름이 그렇게 적혀 있다 —
 * 「역할의 권위는 도메인 `users.role`」). 그 claim 경로가 걷히며 인자도 함께 걷었다.
 */
function req(sub: string, init: RequestInit = {}): Request {
  return new Request('http://localhost/api/x', {
    ...init,
    headers: {
      cookie: `pullim_dev_identity=${sub}`,
      host: DEV_HOST,
      ...(init.headers ?? {}),
    },
  });
}

/** 조립된 술어를 실제 Postgres SQL 문자열로 펼친다. */
function render(sqlLike: unknown): { text: string; params: unknown[] } {
  const query = new PgDialect().sqlToQuery(
    sqlLike as Parameters<PgDialect['sqlToQuery']>[0],
  );
  return { text: query.sql, params: query.params };
}

describe('교사 소유권 — 남의 반은 404 (존재도 알리지 않는다)', () => {
  const ctx = { params: Promise.resolve({ id: 'cr_eng_b' }) };

  it('POST /api/teacher/classrooms/[id]/join-codes — 남의 반이면 404', async () => {
    mockSelectQueue = [
      [{ role: 'teacher' }], // resolveActor
      [], // 명의를 조회 조건에 넣었으므로 남의 반은 0행으로 떨어진다
    ];

    const res = await issueCode(req('teacher_001', { method: 'POST' }), ctx);

    expect(res.status).toBe(404);
    const body = (await res.json()) as { code?: string };
    expect(body.code).toBe('NOT_FOUND');
    // 소유권이 아니면 코드를 지우지도 뽑지도 않는다.
    expect(deleteSpy).not.toHaveBeenCalled();
    expect(insertValuesSpy).not.toHaveBeenCalled();
  });

  it('소유권을 조회 조건에 넣는다 — 읽고 나서 비교하지 않는다', async () => {
    mockSelectQueue = [[{ role: 'teacher' }], []];

    await getStudents(req('teacher_001'), ctx);

    // 반 조회 술어에 반 id 와 **명의**가 함께 들어가야 한다.
    const { params } = render(whereSpy.mock.calls[1][0]);
    expect(params).toContain('cr_eng_b');
    expect(params).toContain('teacher_001');
  });

  it('재발급은 반 행을 잠그고 시작한다 — 동시에 두 코드가 살아남지 않게', async () => {
    mockSelectQueue = [
      [{ role: 'teacher' }], // resolveActor
      [{ id: 'cr_math_a', label: '고2 미적분 A반', teacherId: 'teacher_001' }], // 내 반
      [], // resolveClassroomPairs ① join_codes
      [{ classroomId: 'cr_math_a', botId: 'cb_001' }], // ② enrollments 로 복원한 짝
      [{ id: 'cb_001' }], // 짝 봇 소유 확인
      [{ id: 'cr_math_a' }], // 반 행 잠금(FOR UPDATE)
    ];
    mockInsertQueue = [[{ code: 'NEWCODE' }]];

    await issueCode(req('teacher_001', { method: 'POST' }), {
      params: Promise.resolve({ id: 'cr_math_a' }),
    });

    /*
      DELETE→INSERT 순서만으로는 「살아 있는 코드는 하나」가 안 된다 — 동시 재발급 둘이
      각자 지우고 **서로 다른 코드를 넣으면** 둘 다 남는다(`join_codes` PK 는 `code` 하나라
      (bot, classroom) 조합을 막지 않는다). 반 행 잠금이 그 둘을 줄 세운다.
    */
    expect(forSpy).toHaveBeenCalledWith('update');

    // 잠금이 **지우기보다 먼저** 걸려야 의미가 있다.
    expect(forSpy.mock.invocationCallOrder[0]).toBeLessThan(
      deleteSpy.mock.invocationCallOrder[0],
    );
  });

  it('GET /api/teacher/classrooms/[id]/students — 남의 반이면 404 (명단 유출 차단)', async () => {
    mockSelectQueue = [[{ role: 'teacher' }], []];

    const res = await getStudents(req('teacher_001'), ctx);

    expect(res.status).toBe(404);
    const body = (await res.json()) as { students?: unknown; code?: string };
    expect(body.code).toBe('NOT_FOUND');
    expect(body.students).toBeUndefined();
    // 없는 반과 남의 반이 **같은 답**이어야 존재가 새 나가지 않는다.
  });

  it('학생이 교사 라우트를 치면 403 FORBIDDEN_ROLE (역할 불일치만 403)', async () => {
    mockSelectQueue = [[{ role: 'student' }]];

    const res = await getStudents(req('student_001'), ctx);

    expect(res.status).toBe(403);
    const body = (await res.json()) as { code?: string };
    expect(body.code).toBe('FORBIDDEN_ROLE');
  });
});

describe('POST /api/teacher/classrooms — 반 + 봇 + 코드를 한 트랜잭션으로', () => {
  it('세 행을 다 만들고 201 { classroom, bot, joinCode }', async () => {
    mockSelectQueue = [
      [{ role: 'teacher' }], // resolveActor
      [{ name: '김수학' }], // 교사 이름
    ];
    mockInsertQueue = [
      [{ id: 'cr_new', label: '고2 미적분 B반', organization: '풀림', teacherId: 'teacher_001' }],
      [{ id: 'cb_new', name: '미적분 도우미', teacherId: 'teacher_001' }],
      [{ code: 'ABCDEF' }],
    ];

    const res = await createClassroom(
      req('teacher_001', {
        method: 'POST',
        body: JSON.stringify({
          label: '고2 미적분 B반',
          subject: '수학Ⅱ',
          grade: '고2',
          organization: '풀림',
        }),
      }),
    );

    expect(res.status).toBe(201);
    const body = (await res.json()) as {
      classroom?: { id?: string };
      bot?: { id?: string };
      joinCode?: string;
    };
    expect(body.classroom?.id).toBe('cr_new');
    expect(body.bot?.id).toBe('cb_new');
    expect(body.joinCode).toBe('ABCDEF');

    // 세 번의 insert — classrooms · class_bots · join_codes.
    expect(insertValuesSpy).toHaveBeenCalledTimes(3);
    const [classroomValues, botValues, codeValues] = insertValuesSpy.mock.calls.map(
      (c) => c[0] as Record<string, unknown>,
    );
    expect(classroomValues.id).toMatch(/^cr_/);
    expect(classroomValues.teacherId).toBe('teacher_001');
    // class_bots 의 NOT NULL 컬럼을 전부 채운다(default 가 없는 것들).
    expect(botValues).toMatchObject({
      teacherId: 'teacher_001',
      teacherName: '김수학',
      organization: '풀림',
      subject: '수학Ⅱ',
      grade: '고2',
    });
    expect(botValues.id).toMatch(/^cb_/);
    expect(botValues.name).toBeTruthy();
    expect(botValues.tone).toBeTruthy();
    expect(botValues.greeting).toBeTruthy();
    // join_codes.teacher_id 가 비면 소유권 복합 FK 가 검사에서 빠진다.
    expect(codeValues.teacherId).toBe('teacher_001');
  });

  it('필수 값이 비면 400 INVALID_INPUT (우리말 문구)', async () => {
    mockSelectQueue = [[{ role: 'teacher' }]];

    const res = await createClassroom(
      req('teacher_001', {
        method: 'POST',
        body: JSON.stringify({ label: '  ', subject: '수학', grade: '고2' }),
      }),
    );

    expect(res.status).toBe(400);
    const body = (await res.json()) as { code?: string; message?: string };
    expect(body.code).toBe('INVALID_INPUT');
    expect(body.message).toContain('수업방 이름');
    expect(insertValuesSpy).not.toHaveBeenCalled();
  });
});

describe('학생 과제 술어 — 반 단위 발사까지 본다', () => {
  it('개인 배정 OR (student_id NULL AND sent AND (지정 OR 반 전체+참여))', () => {
    const { text, params } = render(visibleAssignmentsWhere('s2', 'student-own'));

    // ① 개인 배정
    expect(text).toContain('"assignments"."student_id" =');
    // ② 반 단위 발사 — 학생 행이 없다
    expect(text).toContain('"assignments"."student_id" is null');
    // ③ 보내진 것만(draft/scheduled/withdrawn 누출 차단)
    expect(text).toContain('"assignments"."dispatch_status" =');
    expect(params).toContain('sent');
    // ④ 지정 발사 — jsonb 포함
    expect(text).toContain('@>');
    expect(params).toContain(JSON.stringify(['s2']));
    // ⑤ 반 전체(빈 배열) + 그 봇에 참여 중
    expect(text).toContain(`'[]'::jsonb`);
    expect(text).toContain('"enrollments"');
    expect(params.filter((p) => p === 's2').length).toBeGreaterThanOrEqual(2);
  });
});

describe('학부모 자녀 조회 — 반·과제는 학생의 살아 있는 동의 뒤에 있다 (05 § 11.4)', () => {
  /*
    규칙 1 은 「미동의 자녀의 데이터는 **애초에 읽지 않는다**」이지 「읽어 놓고 안 보낸다」가
    아니다. 그런데 「동의를 먼저 조회해 열린 자녀 명단을 만들고, 그 명단으로 반·과제를
    조건 없이 읽는」 형태도 결국 읽어 놓고 거르는 쪽에 가깝다 — 두 걸음 사이에 학생이 공유를
    거두면 이미 통과한 명단이 두 번째 질의를 열어 준다. 그래서 여기서 보는 것은 응답 모양만이
    아니라 **보호 대상 질의 자체에 동의 술어가 들어갔는가**다.

    규칙 2 는 「미동의와 무활동을 구별할 수 없게」다. 그래서 동의가 없을 때의 응답은
    「참여한 반이 0곳인 아이」와 **같은 모양**이어야 한다 — 이유를 말하는 필드를 더하지 않는다.

    DB 는 mock 이라 EXISTS 의 참·거짓을 실제로 판정하지 않는다. 「동의가 없다」는 상황은
    보호 질의가 **0행을 돌려주는 것**으로 흉내 내고(실 DB 에서 EXISTS 가 거짓일 때 그렇다),
    술어가 정말 질의 안에 있는지는 조립된 SQL 을 펼쳐 본다.
  */

  /** 과제 한 행 — 학부모에게 나가면 안 되는 칸을 일부러 함께 싣는다. */
  const ASSIGNMENT_ROW = {
    id: 'as_1',
    botId: 'cb_001',
    studentId: 'child_1',
    title: '도함수 활용 마무리',
    scope: '미적분 III',
    subject: '수학Ⅱ',
    grade: '고2',
    chapterFrom: '극값',
    chapterTo: '변곡점',
    achievementCodes: ['수2-3-2'],
    questionCount: 20,
    difficulty: '중',
    mode: 'practice',
    scopeOverride: null,
    source: 'teacher-assigned',
    assignedBy: '김수학 선생님',
    assignedAtLabel: '어제',
    dueLabel: '내일까지',
    dDay: 'D-1',
    completedCount: 8,
    recentAccuracy: 0.72,
    state: 'in-progress',
    reasonHint: '극값에서 자주 틀려요',
    solveHref: '/classbot/assignment/as_1/solve',
    targetStudentIds: ['child_1', 'other_kid'],
    dispatchStatus: 'sent',
    createdBy: 'teacher_001',
    dispatchedAt: null,
    examTimeLimitMin: null,
    requizQuestionIds: null,
  };

  /** 자녀 한 명당 보호 질의 둘(수업방·과제)이 나간다 — 큐에 넣을 「0행」 한 쌍. */
  const CLOSED_CHILD = [[], []];

  it('동의가 없으면 자녀 이름·관계는 내리고 반·과제는 빈 배열이다 (규칙 2)', async () => {
    mockSelectQueue = [
      [{ role: 'parent' }], // resolveActor — 역할 권위는 도메인 users
      [
        { id: 'child_1', name: '서연', relation: '모' },
        { id: 'child_2', name: '지호', relation: '모' },
      ],
      ...CLOSED_CHILD, // 서연 — EXISTS 가 거짓이라 0행
      ...CLOSED_CHILD, // 지호 — 마찬가지
    ];

    const res = await getParentChildren(req('parent_001'));
    expect(res.status).toBe(200);

    const body = (await res.json()) as {
      children: { id: string; name: string; relation: string; classrooms: unknown[]; assignments: unknown[] }[];
    };

    // 자녀 목록 자체는 가리지 않는다 — 가리면 「이어진 자녀가 없다」와 구분이 사라진다(규칙 2 단서).
    expect(body.children).toHaveLength(2);
    expect(body.children[0]).toMatchObject({ id: 'child_1', name: '서연', relation: '모' });

    // 내용은 빈 배열 — 부모 눈에 「참여한 반이 없다」와 같은 모습이어야 한다(규칙 2).
    for (const child of body.children) {
      expect(child.classrooms).toEqual([]);
      expect(child.assignments).toEqual([]);
    }
  });

  it('동의 술어가 **보호 질의 안에** 있다 — 수업방·과제 각각의 where 에 (규칙 1)', async () => {
    mockSelectQueue = [
      [{ role: 'parent' }],
      [{ id: 'child_1', name: '서연', relation: '모' }],
      ...CLOSED_CHILD,
    ];

    await getParentChildren(req('parent_001'));

    const wheres = whereSpy.mock.calls.map((call) => render(call[0]));
    // 과제를 읽는 술어와 수업방(참여)을 읽는 술어를 각각 집는다.
    const assignmentWhere = wheres.find((w) => w.text.includes('"assignments"."student_id"'));
    const enrollmentWhere = wheres.find(
      (w) => w.text.includes('"enrollments"."student_id"') && !w.text.includes('"assignments"'),
    );
    expect(assignmentWhere).toBeDefined();
    expect(enrollmentWhere).toBeDefined();

    for (const gated of [assignmentWhere!, enrollmentWhere!]) {
      /*
        동의를 따로 조회해 Set 으로 들고 다니면 이 자리에는 아무것도 남지 않는다 — 그 형태를
        여기서 막는다. 술어가 질의 안에 있어야 철회가 **다음 질의부터**가 아니라 **그 질의에서**
        듣는다.
      */
      expect(gated.text).toContain('"consent_logs"');
      // 철회·만료가 함께 걸려 있어야 「살아 있는 동의」다.
      expect(gated.text).toContain('"revoked_at" is null');
      expect(gated.text).toContain('now()');
      // 남의 보호자에게 준 동의로 열리면 학생이 고른 상대가 아닌 사람에게 자료가 나간다.
      expect(gated.text).toContain('"parent_id"');
      expect(gated.params).toContain('parent_001');
      // 자기주도는 다른 축이라 이 하나로 함께 열리면 안 된다.
      expect(gated.text).toContain('"type"');
      expect(gated.params).toContain('class_assignment_summary');
      // 게이트가 학생 좁히기를 대체하지 않았는지 — 자녀 id 가 술어에 남아 있어야 한다.
      expect(gated.params).toContain('child_1');
    }
  });

  it('동의를 준 자녀만 열린다 — 안 준 형제는 같은 응답에서 그대로 빈 배열이다', async () => {
    mockSelectQueue = [
      [{ role: 'parent' }],
      [
        { id: 'child_1', name: '서연', relation: '모' },
        { id: 'child_2', name: '지호', relation: '모' },
      ],
      // 서연 — 동의가 살아 있어 EXISTS 가 참인 경우.
      // `joinedAt` 은 매퍼가 ISO 로 바꾸는 칸이라 Date 여야 한다(`student-views.ts`).
      [{ classroomId: 'cr_math_a', label: '고2 미적분 A반', joinedAt: new Date('2026-03-02T00:00:00Z') }],
      [ASSIGNMENT_ROW],
      ...CLOSED_CHILD, // 지호 — 동의가 없어 두 질의 모두 0행
    ];

    const res = await getParentChildren(req('parent_001'));
    expect(res.status).toBe(200);

    const body = (await res.json()) as {
      children: { id: string; classrooms: unknown[]; assignments: Record<string, unknown>[] }[];
    };
    const [seoyeon, jiho] = body.children;

    expect(seoyeon.classrooms).toHaveLength(1);
    expect(seoyeon.assignments).toHaveLength(1);
    // 동의를 안 준 아이는 **같은 응답 안에서도** 빈 채로 남는다.
    expect(jiho.classrooms).toEqual([]);
    expect(jiho.assignments).toEqual([]);

    // 열린 자녀의 과제도 **행 전개가 아니다** — 나가면 안 되는 칸이 빠져 있어야 한다.
    const assignment = seoyeon.assignments[0];
    expect(assignment).toMatchObject({ id: 'as_1', title: '도함수 활용 마무리', completedCount: 8 });
    for (const leaked of ['recentAccuracy', 'solveHref', 'targetStudentIds', 'reasonHint', 'studentId']) {
      expect(assignment).not.toHaveProperty(leaked);
    }
  });

  it('과제는 `class-summary` 축으로만 읽는다 — 자기주도는 다른 스위치다', async () => {
    mockSelectQueue = [
      [{ role: 'parent' }],
      [{ id: 'child_1', name: '서연', relation: '모' }],
      ...CLOSED_CHILD,
    ];

    await getParentChildren(req('parent_001'));

    const assignmentWhere = whereSpy.mock.calls
      .map((call) => render(call[0]))
      .find((w) => w.text.includes('"assignments"."student_id"'));
    // 출처 허용 목록이 술어 안에 있다 — 학생 본인 축(`/api/assignments`)에는 없는 조건이다.
    expect(assignmentWhere!.text).toContain('"assignments"."source"');
    expect(assignmentWhere!.params).not.toContain('self');
  });

  it('보호자가 아니면 403, 미인증은 401', async () => {
    mockSelectQueue = [[{ role: 'student' }]];
    const forbiddenRes = await getParentChildren(req('s2'));
    expect(forbiddenRes.status).toBe(403);

    const unauthRes = await getParentChildren(
      new Request('http://localhost/api/parent/children'),
    );
    expect(unauthRes.status).toBe(401);
  });
});

describe('GET /api/teacher/classrooms — 카드가 게시 상태를 함께 들고 온다', () => {
  /** 반 한 칸(`classrooms` 행). */
  const ROOM = {
    id: 'cr_math_a',
    label: '고2 미적분 A반',
    organization: '풀림',
    teacherId: 'teacher_001',
  };

  it('짝 봇의 게시 상태를 그대로 싣는다', async () => {
    mockSelectQueue = [
      [{ role: 'teacher' }], // resolveActor
      [ROOM], // 내 반
      [], // resolveClassroomPairs ① join_codes
      [{ classroomId: ROOM.id, botId: 'cb_001' }], // ② enrollments 로 복원한 짝
      [
        {
          id: 'cb_001',
          name: '수학이 형',
          subject: '수학Ⅱ',
          grade: '고2',
          isPublished: true,
          publishedAt: new Date('2026-09-01T00:00:00Z'),
          publishBlurb: '같이 미적분 뜯어봐요',
        },
      ],
      [{ classroomId: ROOM.id, count: 1 }], // 참여 인원
    ];

    const res = await getClassrooms(req('teacher_001'));
    const body = (await res.json()) as { classrooms: TeacherClassroomItem[] };

    expect(res.status).toBe(200);
    expect(body.classrooms[0]).toMatchObject({
      botId: 'cb_001',
      isPublished: true,
      publishedAt: '2026-09-01T00:00:00.000Z',
      publishBlurb: '같이 미적분 뜯어봐요',
    });
    // 카드가 이걸 들고 오므로 배지 하나 때문에 마켓 목록(남의 봇까지)을 받을 필요가 없다.
  });

  it('짝 봇이 없는 반은 isPublished:false — 터지지 않는다', async () => {
    mockSelectQueue = [
      [{ role: 'teacher' }],
      [ROOM],
      [], // 코드도 없고
      [], // 참여 행도 없다 → 짝을 못 찾는다
      // 짝이 없으면 봇 조회를 아예 건너뛴다(botIds 가 비어 있다) — 다음은 인원 집계다.
      [],
    ];

    const res = await getClassrooms(req('teacher_001'));
    const body = (await res.json()) as { classrooms: TeacherClassroomItem[] };

    expect(res.status).toBe(200);
    expect(body.classrooms[0]).toMatchObject({
      botId: null,
      isPublished: false,
      publishedAt: null,
      publishBlurb: null,
    });
  });
});
