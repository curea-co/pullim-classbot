/**
 * @jest-environment node
 *
 * 담은 봇 라우트 단위 테스트 (자기주도 계약 §2).
 *
 * 여기서 지키려는 것 다섯:
 *  1. **명의는 신원에서만** — 본문에 `studentId` 를 실어도 쓰기·조회 술어에는 토큰의
 *     주인이 들어간다. 남의 목록에 봇을 밀어 넣는 경로가 없다는 것이 이 라우트의 전부다.
 *  2. **멱등 담기** — 같은 봇을 두 번 담으면 201 이 아니라 **200**, 그리고 `addedAt` 은
 *     처음 담은 시각 그대로다(재시도가 목록 순서를 흔들면 안 된다).
 *  3. **없던 것을 빼도 200** — `removed:false` 다. 404 로 답하면 아무 일도 안 해도 되는
 *     자리에서 화면이 빨개진다.
 *  4. **학생만** — 자기주도는 역할이 아니라 학생의 하위 컨텍스트다(dual-mode spec §1·§7).
 *     교사·학부모 신원은 세 메서드 모두 403 이고, 역할의 권위는 **도메인 `users.role`**
 *     이라 토큰 claim 이 student 라도 그 행이 teacher 면 막힌다.
 *  5. **담기는 마켓과 같은 조건을 본다** — 술어에 `is_published` 가 들어간다. 미게시 봇은
 *     없는 봇과 **똑같이 404** 라, 「그 id 의 봇이 있긴 하다」가 응답에 남지 않는다.
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

/**
 * 서명된 토큰을 실은 요청.
 *
 * 토큰 claim 의 role 은 공유 `UserRole` 이라 'parent' 가 없다 — 학부모는 claim 이 아니라
 * **도메인 `users.role`** 로만 식별된다(`app/api/_lib/guards.ts` 머리주석). 그래서 학부모
 * 사례는 토큰이 아니라 아래 `actorRow('parent')` 로 만든다.
 */
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

/**
 * `resolveActor` 가 읽는 도메인 `users.role` 한 줄 — **모든 select 큐의 맨 앞**이다.
 * 역할 게이트가 붙으면서 세 메서드 전부 이 조회를 먼저 한다.
 */
const actorRow = (role: 'student' | 'teacher' | 'parent'): unknown[] => [{ role }];

/** 담기 전 게시 확인이 찾아낸 봇 한 줄 — 큐에서 `actorRow` 다음 자리. */
const publishedBotRow = (botId: string): unknown[] => [{ botId }];

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

  it('신원이 없으면 역할을 읽으러 가지도 않는다', async () => {
    await getSelfBots(anonReq());
    expect(whereSpy).not.toHaveBeenCalled();
  });
});

describe('명의는 신원에서만 — 본문은 믿지 않는다', () => {
  it('POST 는 토큰 주인으로 쓴다(본문의 studentId 를 무시)', async () => {
    mockSelectQueue = [actorRow('student'), publishedBotRow('cb_001')];
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
    mockSelectQueue = [actorRow('student'), []];

    await getSelfBots(req('s2', 'student'));

    // 0번째는 `resolveActor` 의 users 조회다. 목록의 술어는 그다음.
    const { params } = render(whereSpy.mock.calls[1][0]);
    expect(params).toEqual(['s2']);
  });

  it('DELETE 술어는 봇 id **와** 내 명의 둘 다 — 경로에 남의 봇을 넣어도 남의 행에 안 닿는다', async () => {
    mockSelectQueue = [actorRow('student')];
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
      actorRow('student'),
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
    mockSelectQueue = [actorRow('student'), publishedBotRow('cb_001')];
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
    mockSelectQueue = [
      actorRow('student'),
      publishedBotRow('cb_001'),
      [{ botId: 'cb_001', addedAt: new Date('2026-09-01T01:00:00Z') }],
    ];

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

  it('삽입 전에 **is_published 와 봇 id 를 함께** 묻는다 — 마켓 단건과 같은 술어', async () => {
    mockSelectQueue = [actorRow('student'), publishedBotRow('cb_001')];
    mockInsertQueue = [[{ botId: 'cb_001', addedAt: new Date('2026-09-03T00:00:00Z') }]];

    await addSelfBot(
      req('student_001', 'student', {
        method: 'POST',
        body: JSON.stringify({ botId: 'cb_001' }),
      }),
    );

    // 0번째는 `resolveActor` 의 users 조회. 1번째가 게시 확인이다.
    const { text, params } = render(whereSpy.mock.calls[1][0]);
    expect(text).toContain('is_published');
    expect(params).toContain('cb_001');
    expect(params).toContain(true);
  });

  it('게시 안 된 봇은 404 — 그리고 **한 줄도 쓰지 않는다**', async () => {
    // 술어에 `is_published` 가 들어가므로 안 걸린 봇은 0행이다.
    mockSelectQueue = [actorRow('student'), []];

    const res = await addSelfBot(
      req('student_001', 'student', {
        method: 'POST',
        body: JSON.stringify({ botId: 'cb_unpublished' }),
      }),
    );

    expect(res.status).toBe(404);
    expect(((await res.json()) as { code?: string }).code).toBe('NOT_FOUND');
    expect(insertValuesSpy).not.toHaveBeenCalled();
  });

  it('없는 봇 id 도 **같은 404** — 안 걸린 봇과 구분되지 않는다', async () => {
    mockSelectQueue = [actorRow('student'), []];

    const res = await addSelfBot(
      req('student_001', 'student', {
        method: 'POST',
        body: JSON.stringify({ botId: 'cb_nonexistent' }),
      }),
    );

    // 미게시와 응답이 갈리면 「그 id 의 봇이 있긴 하다」가 새 나간다.
    expect(res.status).toBe(404);
    expect(((await res.json()) as { code?: string }).code).toBe('NOT_FOUND');
  });

  it('게시 확인과 삽입 사이에 봇이 지워지면 400 — FK 위반을 500 으로 흘리지 않는다', async () => {
    mockSelectQueue = [actorRow('student'), publishedBotRow('cb_001')];
    mockInsertError = new Error(
      'insert or update on table "self_enrollments" violates foreign key constraint',
    );

    const res = await addSelfBot(
      req('student_001', 'student', {
        method: 'POST',
        body: JSON.stringify({ botId: 'cb_001' }),
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
    mockSelectQueue = [actorRow('student')];

    const res = await addSelfBot(
      req('student_001', 'student', { method: 'POST', body }),
    );

    expect(res.status).toBe(400);
    expect(insertValuesSpy).not.toHaveBeenCalled();
  });
});

describe('DELETE /api/me/self-bots/[botId] — 없던 것도 200', () => {
  it('지웠으면 200 { removed:true }', async () => {
    mockSelectQueue = [actorRow('student')];
    mockDeleteQueue = [[{ botId: 'cb_001' }]];

    const res = await removeSelfBot(
      req('student_001', 'student', { method: 'DELETE' }),
      ctx('cb_001'),
    );

    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ removed: true });
  });

  it('없던 행이면 404 가 아니라 200 { removed:false }', async () => {
    mockSelectQueue = [actorRow('student')];
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

describe('학생만 — 자기주도는 역할이 아니라 학생의 하위 컨텍스트다', () => {
  it('교사 신원의 GET 은 403 — 목록을 읽으러 가지도 않는다', async () => {
    mockSelectQueue = [actorRow('teacher')];

    const res = await getSelfBots(req('teacher_001', 'teacher'));

    expect(res.status).toBe(403);
    expect(((await res.json()) as { code?: string }).code).toBe('FORBIDDEN_ROLE');
    // users 조회 하나로 끝난다 — self_enrollments 는 건드리지 않는다.
    expect(whereSpy).toHaveBeenCalledTimes(1);
  });

  it('교사 신원의 POST 는 403 — 교사 명의로 담긴 행이 생기지 않는다', async () => {
    mockSelectQueue = [actorRow('teacher')];

    const res = await addSelfBot(
      req('teacher_001', 'teacher', {
        method: 'POST',
        body: JSON.stringify({ botId: 'cb_001' }),
      }),
    );

    expect(res.status).toBe(403);
    expect(insertValuesSpy).not.toHaveBeenCalled();
  });

  it('교사 신원의 DELETE 도 403', async () => {
    mockSelectQueue = [actorRow('teacher')];

    const res = await removeSelfBot(
      req('teacher_001', 'teacher', { method: 'DELETE' }),
      ctx('cb_001'),
    );

    expect(res.status).toBe(403);
    expect(deleteWhereSpy).not.toHaveBeenCalled();
  });

  it('학부모 신원도 403 — 토큰에 없는 역할이라 도메인 users 행으로만 갈린다', async () => {
    mockSelectQueue = [actorRow('parent')];

    const res = await addSelfBot(
      // 토큰 claim 은 student 다(공유 UserRole 에 parent 가 없다).
      req('parent_001', 'student', {
        method: 'POST',
        body: JSON.stringify({ botId: 'cb_001' }),
      }),
    );

    expect(res.status).toBe(403);
    expect(insertValuesSpy).not.toHaveBeenCalled();
  });

  it('역할의 권위는 **도메인 users.role** — 토큰이 student 라도 그 행이 teacher 면 막힌다', async () => {
    mockSelectQueue = [actorRow('teacher')];

    const res = await addSelfBot(
      req('teacher_001', 'student', {
        method: 'POST',
        body: JSON.stringify({ botId: 'cb_001' }),
      }),
    );

    expect(res.status).toBe(403);
    expect(insertValuesSpy).not.toHaveBeenCalled();
  });
});
