/**
 * @jest-environment node
 *
 * 봇 게시·마켓 라우트 가드 단위 테스트 (마켓 계약 §2).
 *
 * 여기서 지키려는 것 넷:
 *  1. **소유권** — 남의 봇 id 로 게시·내리기를 치면 **404**(403 이 아니다). 403 은
 *     "그 봇은 있는데 네 것이 아니다" 를 알려 주는 답이라 남의 봇 존재가 새 나간다.
 *     역할 불일치(학생이 교사 라우트)만 403 `FORBIDDEN_ROLE` 이다.
 *  2. **내리면 시각도 지운다** — `published_at` 이 남으면 "내렸는데 게시 시각이 있는" 행이
 *     되어 이 컬럼으로 상태를 읽는 코드가 조용히 틀린 답을 낸다.
 *  3. **한 줄 소개 200자** — 넘으면 400 `INVALID_INPUT`, 딱 200자는 통과.
 *  4. **마켓은 역할 무관** — 학생·교사·학부모가 같은 200 을 받는다. 막는 건 미인증뿐이다.
 *     (역할을 아예 읽지 않는지까지 본다 — 읽지 않으면 분기가 끼어들 자리도 없다.)
 *
 * DB 는 mock 이라 실 Postgres 없이 **가드 순서와 조립된 SQL** 만 본다.
 */
import { createHmac } from 'node:crypto';

import type { AccessTokenPayload } from '@pullim-classbot/types';
import { PgDialect } from 'drizzle-orm/pg-core';

// ── getDb mock — select/update 체인을 가짜로 대체 ──
const whereSpy = jest.fn();
const setSpy = jest.fn();

/** 다음 `select` 들이 차례로 돌려줄 행 묶음(호출 순서대로 shift). */
let mockSelectQueue: unknown[][] = [];
/** 다음 `update ... returning` 들이 차례로 돌려줄 행 묶음. */
let mockUpdateQueue: unknown[][] = [];

jest.mock('@/lib/db', () => {
  type Chain = Record<string, unknown>;

  const selectChain = (): Chain => {
    const chain: Chain = {};
    const ret = () => chain;
    chain.from = ret;
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

  const updateChain = (): Chain => {
    const chain: Chain = {};
    chain.set = (v: unknown) => {
      setSpy(v);
      return chain;
    };
    chain.where = (...args: unknown[]) => {
      whereSpy(...args);
      return chain;
    };
    chain.returning = () => chain;
    chain.then = (resolve: (v: unknown[]) => unknown) =>
      resolve(mockUpdateQueue.shift() ?? []);
    return chain;
  };

  return {
    getDb: () => ({
      select: () => selectChain(),
      update: () => updateChain(),
    }),
  };
});

import {
  DELETE as unpublishBot,
  POST as publishBot,
} from '@/app/api/teacher/bots/[botId]/publish/route';
import { GET as getMarketplaceBot } from '@/app/api/marketplace/bots/[botId]/route';
import { GET as getMarketplaceBots } from '@/app/api/marketplace/bots/route';

const SECRET = 'test-jwt-secret';

/** 게시된 봇 한 행 — `update ... returning` 이 돌려주는 모양. */
const PUBLISHED_ROW = {
  id: 'cb_001',
  name: '수학이 형',
  teacherId: 'teacher_001',
  isPublished: true,
  publishedAt: new Date('2026-09-01T00:00:00Z'),
  publishBlurb: '같이 미적분 뜯어봐요',
};

beforeAll(() => {
  process.env.JWT_SECRET = SECRET;
});

beforeEach(() => {
  whereSpy.mockClear();
  setSpy.mockClear();
  mockSelectQueue = [];
  mockUpdateQueue = [];
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

/**
 * 개발용 신원 쿠키를 실은 요청.
 * 학부모는 JWT claim 에 없는 역할(`UserRole` 은 student/teacher/admin)이라
 * 토큰으로는 만들 수 없다 — 마켓의 「역할 무관」을 학부모로 확인하려면 이 경로뿐이다.
 */
function cookieReq(identity: string): Request {
  return new Request('http://localhost/api/x', {
    headers: { cookie: `pullim_dev_identity=${identity}` },
  });
}

/** 신원이 아예 없는 요청. */
function anonReq(): Request {
  return new Request('http://localhost/api/x');
}

/** 조립된 술어를 실제 Postgres SQL 문자열로 펼친다. */
function render(sqlLike: unknown): { text: string; params: unknown[] } {
  const query = new PgDialect().sqlToQuery(
    sqlLike as Parameters<PgDialect['sqlToQuery']>[0],
  );
  return { text: query.sql, params: query.params };
}

const botCtx = { params: Promise.resolve({ botId: 'cb_001' }) };

describe('POST /publish — 소유권은 조회 조건이다', () => {
  it('남의 봇이면 404 이고 아무것도 안 바꾼다', async () => {
    mockSelectQueue = [[{ role: 'teacher' }]]; // resolveActor
    mockUpdateQueue = [[]]; // 명의를 where 에 넣었으므로 남의 봇은 0행

    const res = await publishBot(
      req('teacher_002', 'teacher', { method: 'POST', body: '{}' }),
      botCtx,
    );

    expect(res.status).toBe(404);
    const body = (await res.json()) as { code?: string; bot?: unknown };
    expect(body.code).toBe('NOT_FOUND');
    // 없는 봇과 남의 봇이 **같은 답**이어야 존재가 새 나가지 않는다.
    expect(body.bot).toBeUndefined();
  });

  it('소유권을 where 에 넣는다 — 읽고 나서 주인을 비교하지 않는다', async () => {
    mockSelectQueue = [[{ role: 'teacher' }]];
    mockUpdateQueue = [[PUBLISHED_ROW]];

    await publishBot(
      req('teacher_001', 'teacher', { method: 'POST', body: '{}' }),
      botCtx,
    );

    // 0번째는 `resolveActor` 의 users 조회다. 게시 update 의 술어는 그다음.
    const { params } = render(whereSpy.mock.calls[1][0]);
    expect(params).toContain('cb_001');
    expect(params).toContain('teacher_001');
  });

  it('학생이 치면 403 FORBIDDEN_ROLE (역할 불일치만 403)', async () => {
    mockSelectQueue = [[{ role: 'student' }]];

    const res = await publishBot(
      req('student_001', 'student', { method: 'POST', body: '{}' }),
      botCtx,
    );

    expect(res.status).toBe(403);
    expect(((await res.json()) as { code?: string }).code).toBe('FORBIDDEN_ROLE');
    expect(setSpy).not.toHaveBeenCalled();
  });

  it('미인증은 401 — 역할을 물어보러 DB 에 가지도 않는다', async () => {
    const res = await publishBot(
      new Request('http://localhost/api/x', { method: 'POST', body: '{}' }),
      botCtx,
    );

    expect(res.status).toBe(401);
    expect(((await res.json()) as { code?: string }).code).toBe('AUTH_REQUIRED');
  });
});

describe('POST /publish — 한 줄 소개', () => {
  /** 게시 요청 하나를 보낸다(교사 신원 고정). */
  async function publishWith(body: unknown): Promise<Response> {
    mockSelectQueue = [[{ role: 'teacher' }]];
    mockUpdateQueue = [[PUBLISHED_ROW]];
    return publishBot(
      req('teacher_001', 'teacher', { method: 'POST', body: JSON.stringify(body) }),
      botCtx,
    );
  }

  it('200자를 넘으면 400 INVALID_INPUT', async () => {
    const res = await publishWith({ blurb: '가'.repeat(201) });

    expect(res.status).toBe(400);
    const body = (await res.json()) as { code?: string; message?: string };
    expect(body.code).toBe('INVALID_INPUT');
    expect(body.message).toContain('200자');
    expect(setSpy).not.toHaveBeenCalled();
  });

  it('딱 200자는 통과한다 (경계는 열려 있다)', async () => {
    const res = await publishWith({ blurb: '가'.repeat(200) });

    expect(res.status).toBe(200);
    expect(setSpy.mock.calls[0][0]).toMatchObject({ publishBlurb: '가'.repeat(200) });
  });

  it('앞뒤 공백은 길이에 세지 않는다 — 다듬은 뒤 재는다', async () => {
    const res = await publishWith({ blurb: `  ${'가'.repeat(200)}  ` });

    expect(res.status).toBe(200);
    expect(setSpy.mock.calls[0][0]).toMatchObject({ publishBlurb: '가'.repeat(200) });
  });

  it('공백만 적으면 null 로 저장한다 — 빈 소개를 카드에 띄우지 않는다', async () => {
    const res = await publishWith({ blurb: '   ' });

    expect(res.status).toBe(200);
    expect(setSpy.mock.calls[0][0]).toMatchObject({ publishBlurb: null });
  });

  it('본문을 통째로 생략해도 게시된다', async () => {
    mockSelectQueue = [[{ role: 'teacher' }]];
    mockUpdateQueue = [[PUBLISHED_ROW]];

    const res = await publishBot(
      req('teacher_001', 'teacher', { method: 'POST' }),
      botCtx,
    );

    expect(res.status).toBe(200);
    expect(setSpy.mock.calls[0][0]).toMatchObject({ isPublished: true });
  });

  it('소개를 안 보내면 저장된 소개를 지운다 — 요청이 통째로 정한다', async () => {
    const res = await publishWith({});

    expect(res.status).toBe(200);
    // 생략을 「그대로 둔다」로 바꾸면 생략과 `''` 가 다른 뜻이 되고, 호출부가 그 차이를
    // 틀리는 순간 지우려던 소개가 남는다. 그 갈림을 여기서 못박는다.
    expect(setSpy.mock.calls[0][0]).toMatchObject({ publishBlurb: null });
  });

  it('글이 아닌 값은 400 — 객체를 소개로 저장하지 않는다', async () => {
    const res = await publishWith({ blurb: { text: '나쁨' } });

    expect(res.status).toBe(400);
    expect(((await res.json()) as { code?: string }).code).toBe('INVALID_INPUT');
  });
});

describe('DELETE /publish — 내리면 시각도 지운다', () => {
  it('published_at 을 null 로 되돌린다 (스테일 타임스탬프 금지)', async () => {
    mockSelectQueue = [[{ role: 'teacher' }]];
    mockUpdateQueue = [[{ ...PUBLISHED_ROW, isPublished: false, publishedAt: null }]];

    const res = await unpublishBot(
      req('teacher_001', 'teacher', { method: 'DELETE' }),
      botCtx,
    );

    expect(res.status).toBe(200);
    expect(setSpy).toHaveBeenCalledWith({ isPublished: false, publishedAt: null });
  });

  it('한 줄 소개는 남긴다 — 다시 걸 때 그대로 쓴다', async () => {
    mockSelectQueue = [[{ role: 'teacher' }]];
    mockUpdateQueue = [[PUBLISHED_ROW]];

    await unpublishBot(req('teacher_001', 'teacher', { method: 'DELETE' }), botCtx);

    expect(setSpy.mock.calls[0][0]).not.toHaveProperty('publishBlurb');
  });

  it('남의 봇이면 404', async () => {
    mockSelectQueue = [[{ role: 'teacher' }]];
    mockUpdateQueue = [[]];

    const res = await unpublishBot(
      req('teacher_002', 'teacher', { method: 'DELETE' }),
      botCtx,
    );

    expect(res.status).toBe(404);
  });
});

describe('GET /api/marketplace/bots — 역할 무관, 미인증만 막는다', () => {
  it('미인증은 401', async () => {
    const res = await getMarketplaceBots(anonReq());

    expect(res.status).toBe(401);
    expect(((await res.json()) as { code?: string }).code).toBe('AUTH_REQUIRED');
  });

  it.each([
    ['학생', 'student_001'],
    ['교사', 'teacher_001'],
    ['학부모', 'parent_001'],
  ])('%s 도 200 을 받는다', async (_label, identity) => {
    mockSelectQueue = [[]]; // 게시된 봇 0행

    const res = await getMarketplaceBots(cookieReq(identity));

    expect(res.status).toBe(200);
    expect((await res.json()) as { bots?: unknown[] }).toEqual({ bots: [] });
  });

  it('역할을 읽지 않는다 — users 조회 자체가 없다', async () => {
    // 큐에 넣어 둔 한 묶음은 **게시 봇 조회**가 가져가야 한다. 역할을 물으러 갔다면
    // 그걸 먼저 삼켜 목록이 비고, 아래 기대가 깨진다.
    mockSelectQueue = [
      [
        {
          botId: 'cb_001',
          name: '수학이 형',
          avatarEmoji: '🧑‍🏫',
          subject: '수학Ⅱ',
          grade: '고2',
          tone: '친근',
          greeting: '안녕!',
          blurb: null,
          teacherName: '김수학 선생님',
          organization: '풀림',
          publishedAt: new Date('2026-09-01T00:00:00Z'),
        },
      ],
      [{ botId: 'cb_001', count: 3 }],
    ];

    const res = await getMarketplaceBots(cookieReq('student_001'));
    const body = (await res.json()) as {
      bots: Array<{ botId: string; enrolledCount: number; publishedAt: string }>;
    };

    expect(body.bots).toHaveLength(1);
    // 참여 인원은 `class_bots.enrolled_count`(전시용 숫자)가 아니라 참여 행 실측이다.
    expect(body.bots[0]).toMatchObject({ botId: 'cb_001', enrolledCount: 3 });
    expect(body.bots[0].publishedAt).toBe('2026-09-01T00:00:00.000Z');
  });

  it('게시 여부를 조회 조건에 넣는다', async () => {
    mockSelectQueue = [[]];

    await getMarketplaceBots(cookieReq('student_001'));

    const { text, params } = render(whereSpy.mock.calls[0][0]);
    expect(text).toContain('is_published');
    expect(params).toContain(true);
  });
});

describe('GET /api/marketplace/bots/[botId] — 안 걸린 봇은 없는 봇과 같다', () => {
  it('0행이면 404', async () => {
    mockSelectQueue = [[]];

    const res = await getMarketplaceBot(cookieReq('student_001'), botCtx);

    expect(res.status).toBe(404);
    expect(((await res.json()) as { code?: string }).code).toBe('NOT_FOUND');
  });

  it('게시 여부를 where 에 넣는다 — 읽고 나서 걸러내지 않는다', async () => {
    mockSelectQueue = [[]];

    await getMarketplaceBot(cookieReq('student_001'), botCtx);

    const { text, params } = render(whereSpy.mock.calls[0][0]);
    expect(text).toContain('is_published');
    expect(params).toContain('cb_001');
    expect(params).toContain(true);
  });

  it('미인증은 401', async () => {
    const res = await getMarketplaceBot(anonReq(), botCtx);

    expect(res.status).toBe(401);
  });
});
