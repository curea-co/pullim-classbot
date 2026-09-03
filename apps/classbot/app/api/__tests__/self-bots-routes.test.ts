/**
 * @jest-environment node
 *
 * 담은 봇 라우트 단위 테스트 (자기주도 계약 §2).
 *
 * 여기서 지키려는 것 넷:
 *  1. **명의는 신원에서만** — 본문에 `studentId` 를 실어도 쓰기·조회 술어에는 토큰의
 *     주인이 들어간다. 남의 목록에 봇을 밀어 넣는 경로가 없다는 것이 이 라우트의 전부다.
 *  2. **멱등 담기** — 같은 봇을 두 번 담으면 201 이 아니라 **200**, 그리고 `addedAt` 은
 *     처음 담은 시각 그대로다(재시도가 목록 순서를 흔들면 안 된다).
 *  3. **없던 것을 빼도 200** — `removed:false` 다. 404 로 답하면 아무 일도 안 해도 되는
 *     자리에서 화면이 빨개진다.
 *  4. **역할을 보지 않는다** — 학생이 아닌 신원도 자기 목록은 만진다(403 이 없다).
 *
 * DB 는 mock 이라 실 Postgres 없이 **가드 순서와 조립된 SQL** 만 본다. 실제 왕복은
 * 라우트를 dev 서버에 띄워 curl 로 따로 확인했다.
 */
import { createHmac } from 'node:crypto';

import type { AccessTokenPayload } from '@pullim-classbot/types';
import { PgDialect } from 'drizzle-orm/pg-core';

// ── getDb mock — 정본(`classroom-routes.test.ts`)과 같은 thenable 체인 ──
const whereSpy = jest.fn();
const insertValuesSpy = jest.fn();
const deleteWhereSpy = jest.fn();

/** 다음 `select` 들이 차례로 돌려줄 행 묶음(호출 순서대로 shift). */
let mockSelectQueue: unknown[][] = [];
/** 다음 `insert ... returning` 들이 차례로 돌려줄 행 묶음. */
let mockInsertQueue: unknown[][] = [];
/** 다음 `delete ... returning` 들이 차례로 돌려줄 행 묶음. */
let mockDeleteQueue: unknown[][] = [];
/** insert 가 던질 오류 — FK 위반을 흉내 낸다. */
let mockInsertError: Error | null = null;

jest.mock('@/lib/db', () => {
  type Chain = Record<string, unknown>;

  const selectChain = (): Chain => {
    const chain: Chain = {};
    const ret = () => chain;
    chain.from = ret;
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
    chain.then = (resolve: (v: unknown[]) => unknown, reject: (e: unknown) => unknown) =>
      mockInsertError ? reject(mockInsertError) : resolve(mockInsertQueue.shift() ?? []);
    return chain;
  };

  const deleteChain = (): Chain => {
    const chain: Chain = {};
    chain.where = (...args: unknown[]) => {
      deleteWhereSpy(...args);
      return chain;
    };
    chain.returning = () => chain;
    chain.then = (resolve: (v: unknown[]) => unknown) =>
      resolve(mockDeleteQueue.shift() ?? []);
    return chain;
  };

  const makeDb = (): Chain => ({
    select: () => selectChain(),
    insert: () => insertChain(),
    delete: () => deleteChain(),
  });

  return { getDb: () => makeDb() };
});

import { DELETE as removeSelfBot } from '@/app/api/me/self-bots/[botId]/route';
import { GET as getSelfBots, POST as addSelfBot } from '@/app/api/me/self-bots/route';

const SECRET = 'test-jwt-secret';

beforeAll(() => {
  process.env.JWT_SECRET = SECRET;
});

beforeEach(() => {
  whereSpy.mockClear();
  insertValuesSpy.mockClear();
  deleteWhereSpy.mockClear();
  mockSelectQueue = [];
  mockInsertQueue = [];
  mockDeleteQueue = [];
  mockInsertError = null;
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

/** 서명된 토큰을 실은 요청. */
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
  return new Request('http://localhost/api/me/self-bots', {
    ...init,
    headers: { authorization: `Bearer ${token}`, ...(init.headers ?? {}) },
  });
}

/** 신원이 전혀 없는 요청 — 데모 폴백이라 `isIdentified:false` 다. */
function anonReq(init: RequestInit = {}): Request {
  return new Request('http://localhost/api/me/self-bots', init);
}

/** 조립된 술어를 실제 Postgres SQL 문자열로 펼친다. */
function render(sqlLike: unknown): { text: string; params: unknown[] } {
  const query = new PgDialect().sqlToQuery(
    sqlLike as Parameters<PgDialect['sqlToQuery']>[0],
  );
  return { text: query.sql, params: query.params };
}

const ctx = (botId: string) => ({ params: Promise.resolve({ botId }) });

describe('미인증은 401 — 세 메서드 모두', () => {
  it('GET', async () => {
    const res = await getSelfBots(anonReq());
    expect(res.status).toBe(401);
    expect(((await res.json()) as { code?: string }).code).toBe('AUTH_REQUIRED');
  });

  it('POST — 본문을 읽기도 전에 막는다', async () => {
    const res = await addSelfBot(
      anonReq({ method: 'POST', body: JSON.stringify({ botId: 'cb_001' }) }),
    );
    expect(res.status).toBe(401);
    expect(insertValuesSpy).not.toHaveBeenCalled();
  });

  it('DELETE', async () => {
    const res = await removeSelfBot(anonReq({ method: 'DELETE' }), ctx('cb_001'));
    expect(res.status).toBe(401);
    expect(deleteWhereSpy).not.toHaveBeenCalled();
  });
});

describe('명의는 신원에서만 — 본문은 믿지 않는다', () => {
  it('POST 는 토큰 주인으로 쓴다(본문의 studentId 를 무시)', async () => {
    mockInsertQueue = [[{ botId: 'cb_001', addedAt: new Date('2026-09-03T00:00:00Z') }]];

    const res = await addSelfBot(
      req('s2', 'student', {
        method: 'POST',
        // 남의 명의를 실어 보낸다 — 들어가면 안 된다.
        body: JSON.stringify({ botId: 'cb_001', studentId: 'student_001' }),
      }),
    );

    expect(res.status).toBe(201);
    expect(insertValuesSpy).toHaveBeenCalledWith({ botId: 'cb_001', studentId: 's2' });
  });

  it('GET 은 내 행만 — 조회 술어에 토큰 주인이 들어간다', async () => {
    mockSelectQueue = [[]];

    await getSelfBots(req('s2', 'student'));

    const { params } = render(whereSpy.mock.calls[0][0]);
    expect(params).toEqual(['s2']);
  });

  it('DELETE 술어는 봇 id **와** 내 명의 둘 다 — 경로에 남의 봇을 넣어도 남의 행에 안 닿는다', async () => {
    mockDeleteQueue = [[]];

    await removeSelfBot(req('s2', 'student', { method: 'DELETE' }), ctx('cb_001'));

    const { params } = render(deleteWhereSpy.mock.calls[0][0]);
    expect(params).toContain('cb_001');
    expect(params).toContain('s2');
    expect(params).not.toContain('student_001');
  });
});

describe('GET /api/me/self-bots — 담은 순', () => {
  it('200 { bots } — Date 를 ISO 문자열로 편다', async () => {
    mockSelectQueue = [
      [
        { botId: 'cb_001', addedAt: new Date('2026-09-01T01:00:00Z') },
        { botId: 'cb_003', addedAt: new Date('2026-09-02T02:00:00Z') },
      ],
    ];

    const res = await getSelfBots(req('student_001', 'student'));

    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({
      bots: [
        { botId: 'cb_001', addedAt: '2026-09-01T01:00:00.000Z' },
        { botId: 'cb_003', addedAt: '2026-09-02T02:00:00.000Z' },
      ],
    });
  });
});

describe('POST /api/me/self-bots — 멱등 담기', () => {
  it('처음 담으면 201 { bot }', async () => {
    mockInsertQueue = [[{ botId: 'cb_001', addedAt: new Date('2026-09-03T00:00:00Z') }]];

    const res = await addSelfBot(
      req('student_001', 'student', {
        method: 'POST',
        body: JSON.stringify({ botId: 'cb_001' }),
      }),
    );

    expect(res.status).toBe(201);
    expect(await res.json()).toEqual({
      bot: { botId: 'cb_001', addedAt: '2026-09-03T00:00:00.000Z' },
    });
  });

  it('이미 담았으면 200 — 그리고 **처음 담은 시각**을 돌려준다', async () => {
    mockInsertQueue = [[]]; // onConflictDoNothing 이 흡수
    mockSelectQueue = [[{ botId: 'cb_001', addedAt: new Date('2026-09-01T01:00:00Z') }]];

    const res = await addSelfBot(
      req('student_001', 'student', {
        method: 'POST',
        body: JSON.stringify({ botId: 'cb_001' }),
      }),
    );

    expect(res.status).toBe(200);
    // 재시도가 시각을 새로 찍으면 목록 순서가 흔들린다.
    expect(await res.json()).toEqual({
      bot: { botId: 'cb_001', addedAt: '2026-09-01T01:00:00.000Z' },
    });
  });

  it('게시 안 된 봇도 담는다 — 술어에 is_published 가 없다', async () => {
    mockInsertQueue = [[{ botId: 'cb_003', addedAt: new Date('2026-09-03T00:00:00Z') }]];

    const res = await addSelfBot(
      req('student_001', 'student', {
        method: 'POST',
        body: JSON.stringify({ botId: 'cb_003' }),
      }),
    );

    // 담기 전에 봇을 읽지도 않는다 — FK 가 「실재하는 봇인가」만 지킨다.
    expect(res.status).toBe(201);
    expect(whereSpy).not.toHaveBeenCalled();
  });

  it('없는 봇 id 는 400 — FK 위반을 500 으로 흘리지 않는다', async () => {
    mockInsertError = new Error(
      'insert or update on table "self_enrollments" violates foreign key constraint',
    );

    const res = await addSelfBot(
      req('student_001', 'student', {
        method: 'POST',
        body: JSON.stringify({ botId: 'cb_nonexistent' }),
      }),
    );

    expect(res.status).toBe(400);
    expect(((await res.json()) as { code?: string }).code).toBe('INVALID_INPUT');
  });

  it.each([
    ['botId 없음', '{}'],
    ['botId 공백', '{"botId":"   "}'],
    ['botId 가 문자열이 아님', '{"botId":123}'],
    ['본문이 JSON 이 아님', 'not json'],
  ])('%s → 400 (쓰지 않는다)', async (_label, body) => {
    const res = await addSelfBot(
      req('student_001', 'student', { method: 'POST', body }),
    );

    expect(res.status).toBe(400);
    expect(insertValuesSpy).not.toHaveBeenCalled();
  });
});

describe('DELETE /api/me/self-bots/[botId] — 없던 것도 200', () => {
  it('지웠으면 200 { removed:true }', async () => {
    mockDeleteQueue = [[{ botId: 'cb_001' }]];

    const res = await removeSelfBot(
      req('student_001', 'student', { method: 'DELETE' }),
      ctx('cb_001'),
    );

    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ removed: true });
  });

  it('없던 행이면 404 가 아니라 200 { removed:false }', async () => {
    mockDeleteQueue = [[]];

    const res = await removeSelfBot(
      req('student_001', 'student', { method: 'DELETE' }),
      ctx('cb_never_added'),
    );

    // 「내 목록에 없어야 한다」는 의도는 어느 쪽이든 이미 이뤄져 있다.
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ removed: false });
  });
});

describe('역할 게이트가 없다 — 행이 호출자 명의로만 생기므로', () => {
  it('교사 신원도 자기 목록을 읽는다(403 아님)', async () => {
    mockSelectQueue = [[]];

    const res = await getSelfBots(req('teacher_001', 'teacher'));

    expect(res.status).toBe(200);
    const { params } = render(whereSpy.mock.calls[0][0]);
    expect(params).toEqual(['teacher_001']);
  });

  it('교사 신원도 자기 목록에 담는다', async () => {
    mockInsertQueue = [[{ botId: 'cb_001', addedAt: new Date('2026-09-03T00:00:00Z') }]];

    const res = await addSelfBot(
      req('teacher_001', 'teacher', {
        method: 'POST',
        body: JSON.stringify({ botId: 'cb_001' }),
      }),
    );

    expect(res.status).toBe(201);
    expect(insertValuesSpy).toHaveBeenCalledWith({
      botId: 'cb_001',
      studentId: 'teacher_001',
    });
  });
});
