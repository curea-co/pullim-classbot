/**
 * @jest-environment node
 *
 * 수업방·참여 코드·과제 라우트 가드 단위 테스트 (계약 §4).
 *
 * 여기서 지키려는 것 넷:
 *  1. **소유권** — 남의 반 id 를 경로에 넣으면 **404**(403 이 아니다). 403 으로 답하면
 *     "그 반은 있는데 네 것이 아니다" 를 알려 주는 셈이라 남의 반 존재가 새 나간다.
 *     역할 불일치(학생이 교사 라우트)만 403 `FORBIDDEN_ROLE` 이다.
 *  2. **없는 코드** — 404 이지 500 이 아니다.
 *  3. **멱등 참여** — 같은 방에 두 번 들어가도 오류가 아니라 200.
 *  4. **넓힌 학생 술어** — 반 단위 발사(student_id NULL)가 학생 조회에 들어온다.
 *
 * DB 는 mock 이라 실 Postgres 없이 **가드 순서와 조립된 SQL** 만 본다.
 */
import { createHmac } from 'node:crypto';

import type { AccessTokenPayload } from '@pullim-classbot/types';
import { PgDialect } from 'drizzle-orm/pg-core';

// ── getDb mock — select/insert/update/delete/transaction 체인을 가짜로 대체 ──
const whereSpy = jest.fn();
const setSpy = jest.fn();
const insertValuesSpy = jest.fn();
const deleteSpy = jest.fn();

/** 다음 `select` 들이 차례로 돌려줄 행 묶음(호출 순서대로 shift). */
let mockSelectQueue: unknown[][] = [];
/** 다음 `insert ... returning` 들이 차례로 돌려줄 행 묶음. */
let mockInsertQueue: unknown[][] = [];

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
    chain.then = (resolve: (v: unknown[]) => unknown) => resolve([]);
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

import { GET as getAssignments } from '@/app/api/assignments/route';
import { POST as dispatchAssignment } from '@/app/api/teacher/assignments/route';
import { POST as issueCode } from '@/app/api/teacher/classrooms/[id]/join-codes/route';
import { GET as getStudents } from '@/app/api/teacher/classrooms/[id]/students/route';
import {
  GET as getClassrooms,
  POST as createClassroom,
} from '@/app/api/teacher/classrooms/route';
import { POST as joinByCode } from '@/app/api/enrollments/route';
import { GET as getParentChildren } from '@/app/api/parent/children/route';
import { visibleAssignmentsWhere } from '@/app/api/_lib/assignment-visibility';
import type { TeacherClassroomItem } from '@/app/api/_lib/contract-types';

const SECRET = 'test-jwt-secret';

beforeAll(() => {
  process.env.JWT_SECRET = SECRET;
});

beforeEach(() => {
  whereSpy.mockClear();
  setSpy.mockClear();
  insertValuesSpy.mockClear();
  deleteSpy.mockClear();
  mockSelectQueue = [];
  mockInsertQueue = [];
});

function base64Url(input: string | Buffer): string {
  return (typeof input === 'string' ? Buffer.from(input, 'utf-8') : input)
    .toString('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');
}

function signToken(payload: Partial<AccessTokenPayload>): string {
  const h = base64Url(JSON.stringify({ alg: 'HS256', typ: 'JWT' }));
  const p = base64Url(JSON.stringify(payload));
  const sig = base64Url(createHmac('sha256', SECRET).update(`${h}.${p}`).digest());
  return `${h}.${p}.${sig}`;
}

/** 서명된 토큰을 실은 요청 — role 은 도메인 users 행이 다시 판정한다. */
function req(
  sub: string,
  role: 'student' | 'teacher',
  init: RequestInit = {},
): Request {
  const token = signToken({
    sub,
    email: `${sub}@example.com`,
    role,
    type: 'access',
    jti: 'j1',
    exp: Math.floor(Date.now() / 1000) + 3600,
  });
  return new Request('http://localhost/api/x', {
    ...init,
    headers: { authorization: `Bearer ${token}`, ...(init.headers ?? {}) },
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

    const res = await issueCode(req('teacher_001', 'teacher', { method: 'POST' }), ctx);

    expect(res.status).toBe(404);
    const body = (await res.json()) as { code?: string };
    expect(body.code).toBe('NOT_FOUND');
    // 소유권이 아니면 코드를 지우지도 뽑지도 않는다.
    expect(deleteSpy).not.toHaveBeenCalled();
    expect(insertValuesSpy).not.toHaveBeenCalled();
  });

  it('소유권을 조회 조건에 넣는다 — 읽고 나서 비교하지 않는다', async () => {
    mockSelectQueue = [[{ role: 'teacher' }], []];

    await getStudents(req('teacher_001', 'teacher'), ctx);

    // 반 조회 술어에 반 id 와 **명의**가 함께 들어가야 한다.
    const { params } = render(whereSpy.mock.calls[1][0]);
    expect(params).toContain('cr_eng_b');
    expect(params).toContain('teacher_001');
  });

  it('GET /api/teacher/classrooms/[id]/students — 남의 반이면 404 (명단 유출 차단)', async () => {
    mockSelectQueue = [[{ role: 'teacher' }], []];

    const res = await getStudents(req('teacher_001', 'teacher'), ctx);

    expect(res.status).toBe(404);
    const body = (await res.json()) as { students?: unknown; code?: string };
    expect(body.code).toBe('NOT_FOUND');
    expect(body.students).toBeUndefined();
    // 없는 반과 남의 반이 **같은 답**이어야 존재가 새 나가지 않는다.
  });

  it('학생이 교사 라우트를 치면 403 FORBIDDEN_ROLE (역할 불일치만 403)', async () => {
    mockSelectQueue = [[{ role: 'student' }]];

    const res = await getStudents(req('student_001', 'student'), ctx);

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
      req('teacher_001', 'teacher', {
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
      req('teacher_001', 'teacher', {
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

describe('POST /api/teacher/assignments — 반 단위 발사', () => {
  const body = {
    botId: 'cb_001',
    title: '미적분 1단원',
    dueLabel: '내일 22:00',
    questionCount: 5,
    difficulty: '중',
    mode: 'practice',
  };

  function dispatchReq(patch: Record<string, unknown> = {}): Request {
    return req('teacher_001', 'teacher', {
      method: 'POST',
      body: JSON.stringify({ ...body, ...patch }),
    });
  }

  it('남의 봇이면 404 (403 이 아니다 — 봇 존재를 알리지 않는다)', async () => {
    mockSelectQueue = [
      [{ role: 'teacher' }],
      [], // 명의를 조회 조건에 넣었으므로 남의 봇은 0행
    ];

    const res = await dispatchAssignment(dispatchReq({ botId: 'cb_002' }));

    expect(res.status).toBe(404);
    const parsed = (await res.json()) as { code?: string };
    expect(parsed.code).toBe('NOT_FOUND');
    expect(insertValuesSpy).not.toHaveBeenCalled();
  });

  it('내 봇이면 201 + 발사 컬럼을 규약대로 적는다', async () => {
    mockSelectQueue = [
      [{ role: 'teacher' }],
      [{ id: 'cb_001', name: '수학이 형', subject: '수학Ⅱ', grade: '고2' }],
    ];
    mockInsertQueue = [[{ id: 'as_1', botId: 'cb_001' }]];

    const res = await dispatchAssignment(dispatchReq());

    expect(res.status).toBe(201);
    const values = insertValuesSpy.mock.calls[0][0] as Record<string, unknown>;
    expect(values).toMatchObject({
      studentId: null, // 반 단위 — 학생별 행을 만들지 않는다
      targetStudentIds: [], // 빈 배열 = 반 전체
      dispatchStatus: 'sent',
      createdBy: 'teacher_001',
      source: 'teacher-assigned',
      state: 'todo',
      subject: '수학Ⅱ', // 봇에서 파생
      grade: '고2',
      dDay: 'D-1', // '내일 22:00' 에서 파생
    });
    // dispatched_at 은 DEFAULT 가 없다 — 실제 발사 전이인 여기서만 적는다.
    expect(values.dispatchedAt).toBeInstanceOf(Date);
    // 학생 풀이 라우트 모양과 정확히 맞아야 한다.
    expect(values.solveHref).toBe(`/classbot/assignment/${String(values.id)}/solve?step=1`);
    expect(values.id).toMatch(/^as_/);
  });

  it('교사가 고른 단원을 그대로 적는다 — 서버에서 읽는 화면이 단원을 잃지 않게', async () => {
    mockSelectQueue = [
      [{ role: 'teacher' }],
      [{ id: 'cb_001', name: '수학이 형', subject: '수학Ⅱ', grade: '고2' }],
    ];
    mockInsertQueue = [[{ id: 'as_2', botId: 'cb_001' }]];

    const res = await dispatchAssignment(
      dispatchReq({
        scope: '수학Ⅱ > 미분 > 도함수',
        chapterFrom: '수학Ⅱ > 미분 > 도함수',
        chapterTo: '수학Ⅱ > 미분 > 도함수',
      }),
    );

    expect(res.status).toBe(201);
    const values = insertValuesSpy.mock.calls[0][0] as Record<string, unknown>;
    expect(values).toMatchObject({
      scope: '수학Ⅱ > 미분 > 도함수',
      chapterFrom: '수학Ⅱ > 미분 > 도함수',
      chapterTo: '수학Ⅱ > 미분 > 도함수',
    });
  });

  it('단원을 안 보내면 예전 기본값으로 떨어진다 — 단원 없이 내는 경로가 실제로 있다', async () => {
    mockSelectQueue = [
      [{ role: 'teacher' }],
      [{ id: 'cb_001', name: '수학이 형', subject: '수학Ⅱ', grade: '고2' }],
    ];
    mockInsertQueue = [[{ id: 'as_3', botId: 'cb_001' }]];

    const res = await dispatchAssignment(dispatchReq());

    expect(res.status).toBe(201);
    const values = insertValuesSpy.mock.calls[0][0] as Record<string, unknown>;
    expect(values).toMatchObject({ scope: '단원 미정', chapterFrom: '', chapterTo: '' });
  });

  it('이 방에 없는 학생을 지정하면 400', async () => {
    mockSelectQueue = [
      [{ role: 'teacher' }],
      [{ id: 'cb_001', name: '수학이 형', subject: '수학Ⅱ', grade: '고2' }],
      [{ studentId: 'student_001' }], // 둘을 지정했는데 하나만 참여 중
    ];

    const res = await dispatchAssignment(
      dispatchReq({ targetStudentIds: ['student_001', 's2'] }),
    );

    expect(res.status).toBe(400);
    const parsed = (await res.json()) as { code?: string };
    expect(parsed.code).toBe('INVALID_INPUT');
    expect(insertValuesSpy).not.toHaveBeenCalled();
  });
});

describe('POST /api/enrollments — 코드로 참여', () => {
  const codeRow = {
    code: 'ABC123',
    botId: 'cb_001',
    classroomId: 'cr_math_a',
    teacherId: 'teacher_001',
  };
  const botRow = {
    id: 'cb_001',
    teacherName: '김수학',
    organization: '대치프리미엄 수학학원',
  };
  const roomRow = { id: 'cr_math_a', label: '고2 미적분 A반' };

  function joinReq(code: string): Request {
    return req('s2', 'student', { method: 'POST', body: JSON.stringify({ code }) });
  }

  it('없는 코드는 404 NOT_FOUND', async () => {
    mockSelectQueue = [
      [{ role: 'student' }], // resolveActor
      [], // 코드 조회 실패
    ];

    const res = await joinByCode(joinReq('ZZZZZZ'));

    expect(res.status).toBe(404);
    const body = (await res.json()) as { code?: string };
    expect(body.code).toBe('NOT_FOUND');
    expect(insertValuesSpy).not.toHaveBeenCalled();
  });

  it('처음 참여하면 201 + 7개 필수 컬럼을 전부 적는다', async () => {
    mockSelectQueue = [
      [{ role: 'student' }],
      [codeRow],
      [botRow],
      [roomRow],
    ];
    mockInsertQueue = [
      [{ botId: 'cb_001', studentId: 's2', classroomId: 'cr_math_a' }],
    ];

    // 하이픈·소문자로 쳐도 정규화돼 같은 코드로 모인다.
    const res = await joinByCode(joinReq('abc-123'));

    expect(res.status).toBe(201);
    const body = (await res.json()) as { alreadyJoined?: boolean };
    expect(body.alreadyJoined).toBe(false);

    const values = insertValuesSpy.mock.calls[0][0] as Record<string, unknown>;
    expect(values).toMatchObject({
      botId: 'cb_001',
      studentId: 's2',
      classroomId: 'cr_math_a',
      classroomLabel: '고2 미적분 A반',
      assignedBy: '김수학 선생님',
      via: '대치프리미엄 수학학원',
    });
    // assigned_at 은 DEFAULT 가 없다 — 반드시 값이 실려야 한다.
    expect(values.assignedAt).toBeInstanceOf(Date);
  });

  it('이미 참여한 방이면 오류가 아니라 200 + alreadyJoined', async () => {
    const existing = {
      botId: 'cb_001',
      studentId: 's2',
      classroomId: 'cr_math_a',
      classroomLabel: '고2 미적분 A반',
      assignedBy: '김수학 선생님',
      via: '대치프리미엄 수학학원',
    };
    mockSelectQueue = [
      [{ role: 'student' }],
      [codeRow],
      [botRow],
      [roomRow],
      [existing], // 트랜잭션 안에서 기존 행을 되읽는다
    ];
    // 삽입 0행 = PK 충돌(이미 있음).
    mockInsertQueue = [[]];

    const res = await joinByCode(joinReq('ABC123'));

    expect(res.status).toBe(200);
    const body = (await res.json()) as {
      alreadyJoined?: boolean;
      enrollment?: { studentId?: string };
    };
    expect(body.alreadyJoined).toBe(true);
    expect(body.enrollment?.studentId).toBe('s2');
  });

  it('enrolled_count 는 +1 누적이 아니라 COUNT 로 다시 쓴다', async () => {
    mockSelectQueue = [[{ role: 'student' }], [codeRow], [botRow], [roomRow]];
    mockInsertQueue = [[{ botId: 'cb_001', studentId: 's2' }]];

    await joinByCode(joinReq('ABC123'));

    expect(setSpy).toHaveBeenCalledTimes(1);
    const patch = setSpy.mock.calls[0][0] as { enrolledCount?: unknown };
    const { text } = render(patch.enrolledCount);
    expect(text).toContain('count(*)');
    expect(text).toContain('"enrollments"');
  });

  it('학생이 아니면 403 FORBIDDEN_ROLE', async () => {
    mockSelectQueue = [[{ role: 'teacher' }]];

    const res = await joinByCode(
      req('teacher_001', 'teacher', {
        method: 'POST',
        body: JSON.stringify({ code: 'ABC123' }),
      }),
    );

    expect(res.status).toBe(403);
    const body = (await res.json()) as { code?: string };
    expect(body.code).toBe('FORBIDDEN_ROLE');
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

  it('GET /api/assignments 가 그 술어로 조회한다', async () => {
    mockSelectQueue = [[]];

    const res = await getAssignments(req('s2', 'student'));

    expect(res.status).toBe(200);
    expect(whereSpy).toHaveBeenCalledTimes(1);
    const { text } = render(whereSpy.mock.calls[0][0]);
    expect(text).toContain('is null');
    expect(text).toContain('dispatch_status');
    expect(text).toContain('"enrollments"');

    // 학생 본인 축 — 자기 것은 출처를 가르지 않는다.
    expect(text).not.toContain('"assignments"."source"');
  });
});

describe('학부모 자녀 조회 — 자기주도는 반·과제 축으로 나가지 않는다 (05 § 11.4)', () => {
  it('GET /api/parent/children 이 출처 허용 목록을 조회 조건에 싣는다', async () => {
    mockSelectQueue = [
      [{ role: 'parent' }], // resolveActor — 역할 권위는 도메인 users
      [{ id: 'child_1', name: '서연', relation: '모' }], // parent_child_links ⨝ users
      [], // 자녀의 수업방
      [], // 자녀의 과제
    ];

    const res = await getParentChildren(req('parent_001', 'student'));
    expect(res.status).toBe(200);

    // 과제 술어를 찾아낸다 — 라우트가 어떤 순서로 조회하든 흔들리지 않게 내용으로 고른다.
    const assignmentWhere = whereSpy.mock.calls
      .map((call) => render(call[0]))
      .find((q) => q.text.includes('"assignments"."student_id"'));

    if (!assignmentWhere) throw new Error('과제 술어가 조회에 실리지 않았다');

    // 읽고 나서 거르는 게 아니라 **조회 조건 안에** 있어야 한다(규칙 1).
    expect(assignmentWhere.text).toContain('"assignments"."source" in');
    expect(assignmentWhere.params).toContain('teacher-assigned');
    // 자기주도는 다른 동의 축이다 — 부모가 켠 적 없는 것이 딸려 나가면 안 된다.
    expect(assignmentWhere.params).not.toContain('self');
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

    const res = await getClassrooms(req('teacher_001', 'teacher'));
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

    const res = await getClassrooms(req('teacher_001', 'teacher'));
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
