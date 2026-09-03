/**
 * @jest-environment node
 *
 * 동의 라우트 + 학부모 자기주도 라우트 단위 테스트 (학부모×자기주도 계약 §2).
 *
 * 이웃 라우트 테스트(담은 봇·공부한 날)와 겹치는 셋(가드 순서 · 명의는 신원에서만 · 멱등)에
 * 더해, **이 계약에만 있는 넷**을 본다. 넷 다 「고치면 조용히 새는」 자리라 테스트로 묶는다:
 *
 *  1. **동의가 조회 조건 안에 있다** — 조립된 `ON` 술어를 실제 SQL 로 펼쳐, 철회·만료
 *     판정이 거기 들어 있는지 본다. 이게 `WHERE` 밖으로 나가면 미동의 자녀가 「빈 필드」로
 *     응답에 남고, 그 순간 학부모가 미동의와 무활동을 구분하게 된다(§3).
 *  2. **미동의 자녀의 데이터는 읽지도 않는다** — 조인이 0행이면 봇·공부한 날 조회가
 *     아예 일어나지 않는다. 읽어 놓고 안 보내는 것과 읽지 않는 것은 다르다.
 *  3. **받는 사람과 기한은 서버가 정한다** — `parent_id` 는 `parent_child_links` 에서,
 *     `expires_at` 은 `scope_label` 에서. 본문이 둘 중 하나를 실어 보내면 **400 이고
 *     아무것도 쓰지 않는다**(조용한 무시가 아니다).
 *  4. **철회는 행을 지우지 않는다** — `revoked_at` 을 찍는다. 감사 기록이라 「줬다」가 남아야
 *     하고, `expires_at` 을 당겨 때우면 만료와 철회가 구분되지 않는다.
 *
 * DB 는 mock 이라 실 Postgres 없이 **가드 순서와 조립된 SQL** 만 본다. 실제 왕복(부여 →
 * 학부모 화면에 뜸 → 철회 → 사라짐 · 만료 · 남의 보호자)은 dev 서버에 curl 로 따로 확인했다.
 */
import { createHmac } from 'node:crypto';

import type { AccessTokenPayload } from '@pullim-classbot/types';
import { PgDialect } from 'drizzle-orm/pg-core';

// ── getDb mock — 이웃 라우트 테스트와 같은 thenable 체인 ──
const selectFieldsSpy = jest.fn();
const whereSpy = jest.fn();
const joinSpy = jest.fn();
const insertValuesSpy = jest.fn();
const updateSetSpy = jest.fn();

let mockSelectQueue: unknown[][] = [];
let mockInsertQueue: unknown[][] = [];
let mockUpdateQueue: unknown[][] = [];
let mockInsertError: Error | null = null;

jest.mock('@/lib/db', () => {
  type Chain = Record<string, unknown>;

  const selectChain = (): Chain => {
    const chain: Chain = {};
    const ret = () => chain;
    chain.from = ret;
    chain.orderBy = ret;
    chain.limit = ret;
    chain.innerJoin = (table: unknown, on: unknown) => {
      joinSpy(on);
      return chain;
    };
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
    chain.returning = () => chain;
    chain.then = (resolve: (v: unknown[]) => unknown, reject: (e: unknown) => unknown) =>
      mockInsertError ? reject(mockInsertError) : resolve(mockInsertQueue.shift() ?? []);
    return chain;
  };

  const updateChain = (): Chain => {
    const chain: Chain = {};
    chain.set = (v: unknown) => {
      updateSetSpy(v);
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

  const makeDb = (): Chain => ({
    select: (fields: unknown) => {
      selectFieldsSpy(fields);
      return selectChain();
    },
    insert: () => insertChain(),
    update: () => updateChain(),
  });

  return { getDb: () => makeDb() };
});

import { GET as getSelfStudy } from '@/app/api/parent/children/self-study/route';
import { DELETE as revokeConsent } from '@/app/api/me/consents/[type]/route';
import { GET as getConsents, POST as grantConsent } from '@/app/api/me/consents/route';
import {
  expiryFor,
  isScopeLabel,
  resolveGrantRecipient,
  SCOPE_LABELS,
} from '@/app/api/_lib/consent';
import {
  deriveStreakFromDays,
  weekStart,
} from '@/app/api/_lib/self-study-summary';

const SECRET = 'test-jwt-secret';

beforeAll(() => {
  process.env.JWT_SECRET = SECRET;
});

beforeEach(() => {
  selectFieldsSpy.mockClear();
  whereSpy.mockClear();
  joinSpy.mockClear();
  insertValuesSpy.mockClear();
  updateSetSpy.mockClear();
  mockSelectQueue = [];
  mockInsertQueue = [];
  mockUpdateQueue = [];
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
  return new Request('http://localhost/api/me/consents', {
    ...init,
    headers: { authorization: `Bearer ${token}`, ...(init.headers ?? {}) },
  });
}

/** 신원이 전혀 없는 요청 — 데모 폴백이라 `isAuthenticated:false` 다. */
function anonReq(init: RequestInit = {}): Request {
  return new Request('http://localhost/api/me/consents', init);
}

/** 동적 세그먼트 컨텍스트. */
function ctx(type: string): { params: Promise<{ type: string }> } {
  return { params: Promise.resolve({ type }) };
}

/** 조립된 술어를 실제 Postgres SQL 문자열로 펼친다. */
function render(sqlLike: unknown): { text: string; params: unknown[] } {
  const query = new PgDialect().sqlToQuery(
    sqlLike as Parameters<PgDialect['sqlToQuery']>[0],
  );
  return { text: query.sql, params: query.params };
}

/** 부여 본문을 실은 POST. */
function grantReq(sub: string, body: Record<string, unknown>): Request {
  return req(sub, 'student', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
  });
}

describe('미인증은 401 — 네 경로 모두', () => {
  it('학생 동의 목록', async () => {
    const res = await getConsents(anonReq());
    expect(res.status).toBe(401);
    expect(((await res.json()) as { code?: string }).code).toBe('AUTH_REQUIRED');
  });

  it('부여 — 본문을 읽기도 전에 막는다', async () => {
    const res = await grantConsent(
      anonReq({
        method: 'POST',
        body: JSON.stringify({ type: 'self_study_summary', scopeLabel: '계속' }),
      }),
    );
    expect(res.status).toBe(401);
    expect(insertValuesSpy).not.toHaveBeenCalled();
  });

  it('철회 — 아무것도 고치지 않는다', async () => {
    const res = await revokeConsent(
      anonReq({ method: 'DELETE' }),
      ctx('self_study_summary'),
    );
    expect(res.status).toBe(401);
    expect(updateSetSpy).not.toHaveBeenCalled();
  });

  it('학부모 자기주도 — 조회조차 하지 않는다', async () => {
    const res = await getSelfStudy(anonReq());
    expect(res.status).toBe(401);
    expect(selectFieldsSpy).not.toHaveBeenCalled();
  });
});

describe('학부모 라우트의 역할 게이트 — 403 FORBIDDEN_ROLE', () => {
  it.each([
    ['교사', 'teacher'],
    ['학생', 'student'],
  ] as const)('%s 가 치면 막힌다', async (_label, role) => {
    mockSelectQueue = [[{ role }]]; // resolveActor 가 읽는 도메인 users.role
    const res = await getSelfStudy(req('u1', role));

    expect(res.status).toBe(403);
    expect(((await res.json()) as { code?: string }).code).toBe('FORBIDDEN_ROLE');
    // 역할에서 막혔으므로 자녀 조인은 조립되지도 않는다.
    expect(joinSpy).not.toHaveBeenCalled();
  });
});

describe('동의는 조회 조건 안에 있다 — 읽고 나서 거르지 않는다', () => {
  /** 학부모로 자기주도 라우트를 한 번 친다. */
  async function callAsParent(consented: unknown[]): Promise<Response> {
    mockSelectQueue = [[{ role: 'parent' }], consented];
    return getSelfStudy(req('parent_001', 'student'));
  }

  it('조인의 ON 술어에 타입·철회·만료가 전부 들어 있다', async () => {
    await callAsParent([]);

    // 첫 innerJoin 이 consent_logs — 계약 §2 의 조인 그대로.
    const on = render(joinSpy.mock.calls[0][0]);
    expect(on.text).toContain('"consent_logs"."student_id"');
    // 받는 사람까지 맞춘다 — 남에게 준 동의가 이 학부모의 조회를 열지 않는다.
    expect(on.text).toContain('"consent_logs"."parent_id"');
    expect(on.text).toContain('"revoked_at" is null');
    // 만료 비교는 DB 시계로 — 앱 서버가 만든 Date 를 파라미터로 넘기지 않는다.
    expect(on.text).toContain('now()');
    expect(on.params).toContain('self_study_summary');
  });

  it('미동의 자녀는 통째로 빠진다 — 봇도 공부한 날도 **읽지 않는다**', async () => {
    const res = await callAsParent([]);

    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ children: [] });
    // select 는 둘뿐이다: resolveActor 의 role 조회 + 자녀 조인.
    // 셋 이상이면 미동의 자녀의 데이터를 읽고 나서 버렸다는 뜻이다.
    expect(selectFieldsSpy).toHaveBeenCalledTimes(2);
  });

  it('동의한 자녀는 범위와 만료를 함께 싣는다 — 범위를 숨기지 않는다', async () => {
    const expiresAt = new Date('2026-03-08T00:00:00Z');
    mockSelectQueue = [
      [{ role: 'parent' }],
      [
        {
          id: 'student_001',
          name: '서연',
          relation: 'mother',
          scopeLabel: '이번 주만',
          expiresAt,
        },
      ],
      [], // 담은 봇
      [], // 공부한 날
    ];

    const res = await getSelfStudy(req('parent_001', 'student'));
    const body = (await res.json()) as {
      children: Array<Record<string, unknown>>;
    };

    expect(res.status).toBe(200);
    expect(body.children[0]).toMatchObject({
      id: 'student_001',
      name: '서연',
      scopeLabel: '이번 주만',
      expiresAt: expiresAt.toISOString(),
      bots: [],
    });
    // 계약이 안 준 것이 응답에 없다 — 대화·감정·단원 진행.
    expect(Object.keys(body.children[0]).sort()).toEqual([
      'bots',
      'expiresAt',
      'id',
      'name',
      'relation',
      'scopeLabel',
      'streak',
    ]);
  });
});

describe('봇에서 내보내는 칸은 넷뿐 — 행을 그대로 흘리지 않는다', () => {
  it('botId·name·subject·avatarEmoji·addedAt 말고는 나가지 않는다', async () => {
    mockSelectQueue = [
      [{ role: 'parent' }],
      [
        {
          id: 'student_001',
          name: '서연',
          relation: 'mother',
          scopeLabel: '계속',
          expiresAt: null,
        },
      ],
      // `class_bots` 를 그대로 흘렸다면 여기 붙은 인사말·톤·교사명이 응답에 샌다.
      [
        {
          botId: 'cb_003',
          name: '과학 쌤',
          subject: '통합과학',
          avatarEmoji: '🧑‍🔬',
          addedAt: new Date('2026-09-01T00:00:00Z'),
        },
      ],
      [],
    ];

    const res = await getSelfStudy(req('parent_001', 'student'));
    const body = (await res.json()) as {
      children: Array<{ bots: Array<Record<string, unknown>> }>;
    };

    expect(Object.keys(body.children[0].bots[0]).sort()).toEqual([
      'addedAt',
      'avatarEmoji',
      'botId',
      'name',
      'subject',
    ]);
    // 아이가 보는 얼굴이 그대로 부모에게 간다.
    expect(body.children[0].bots[0].avatarEmoji).toBe('🧑‍🔬');
  });
});

describe('부여 — 받는 사람도 기한도 본문이 정하지 않는다', () => {
  it.each([
    ['parentId', { parentId: 'parent_999' }],
    ['parent_id', { parent_id: 'parent_999' }],
    ['expiresAt', { expiresAt: '3000-01-01T00:00:00Z' }],
    ['expires_at', { expires_at: '3000-01-01T00:00:00Z' }],
  ])('본문에 %s 가 있으면 400 이고 **아무것도 쓰지 않는다**', async (_label, extra) => {
    const res = await grantConsent(
      grantReq('student_001', {
        type: 'self_study_summary',
        scopeLabel: '이번 주만',
        ...extra,
      }),
    );

    expect(res.status).toBe(400);
    expect(((await res.json()) as { code?: string }).code).toBe('INVALID_INPUT');
    expect(insertValuesSpy).not.toHaveBeenCalled();
    expect(updateSetSpy).not.toHaveBeenCalled();
  });

  it('parent_id 는 링크에서 읽는다 — 명의는 토큰 주인이다', async () => {
    mockSelectQueue = [[{ id: 'parent_001', name: '어머니', relation: 'mother' }]];
    mockInsertQueue = [
      [
        {
          type: 'self_study_summary',
          scopeLabel: '계속',
          grantedAt: new Date('2026-09-03T00:00:00Z'),
          expiresAt: null,
        },
      ],
    ];

    const res = await grantConsent(
      grantReq('student_001', { type: 'self_study_summary', scopeLabel: '계속' }),
    );

    expect(res.status).toBe(201);
    expect(insertValuesSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        parentId: 'parent_001',
        studentId: 'student_001',
        type: 'self_study_summary',
        scopeLabel: '계속',
        expiresAt: null,
      }),
    );
  });

  it('링크가 없으면 줄 상대가 없다 — 400, 삽입 없음', async () => {
    mockSelectQueue = [[]]; // parent_child_links 0행

    const res = await grantConsent(
      grantReq('s2', { type: 'self_study_summary', scopeLabel: '계속' }),
    );

    expect(res.status).toBe(400);
    expect(insertValuesSpy).not.toHaveBeenCalled();
  });

  it('살아 있는 동의가 있으면 갱신이다 — 200, 새 행 없음', async () => {
    mockSelectQueue = [[{ id: 'parent_001', name: '어머니', relation: 'mother' }]];
    mockUpdateQueue = [
      [
        {
          type: 'self_study_summary',
          scopeLabel: '이번 주만',
          grantedAt: new Date('2026-09-03T00:00:00Z'),
          expiresAt: new Date('2026-09-10T00:00:00Z'),
        },
      ],
    ];

    const res = await grantConsent(
      grantReq('student_001', { type: 'self_study_summary', scopeLabel: '이번 주만' }),
    );

    expect(res.status).toBe(200);
    expect(insertValuesSpy).not.toHaveBeenCalled();
    // 갱신은 살아 있는 동의만 짚는다 — 거둔 행을 되살리지 않는다.
    const where = render(whereSpy.mock.calls[whereSpy.mock.calls.length - 1][0]);
    expect(where.text).toContain('"revoked_at" is null');
    expect(where.params).toContain('student_001');
  });

  it.each([
    ['자기주도 아닌 타입(감정)', { type: 'emotion_share', scopeLabel: '계속' }],
    ['목록 밖 범위', { type: 'self_study_summary', scopeLabel: '영원히' }],
    ['타입 없음', { scopeLabel: '계속' }],
  ])('%s 는 400', async (_label, body) => {
    const res = await grantConsent(grantReq('student_001', body));
    expect(res.status).toBe(400);
    expect(insertValuesSpy).not.toHaveBeenCalled();
  });
});

describe('철회 — 행을 지우지 않고 revoked_at 을 찍는다', () => {
  it('살아 있는 내 동의만 짚어 revoked_at 을 쓴다', async () => {
    mockUpdateQueue = [[{ id: 'c1' }]];

    const res = await revokeConsent(
      req('student_001', 'student', { method: 'DELETE' }),
      ctx('self_study_summary'),
    );

    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ revoked: true });

    // 고치는 칸은 revoked_at 하나 — expires_at 을 당겨 때우지 않는다.
    const set = updateSetSpy.mock.calls[0][0] as Record<string, unknown>;
    expect(Object.keys(set)).toEqual(['revokedAt']);
    expect(render(set.revokedAt).text).toBe('now()');

    // 술어에 내 명의와 살아 있음이 함께 들어간다(남의 동의·이미 거둔 행에 닿지 않는다).
    const where = render(whereSpy.mock.calls[0][0]);
    expect(where.text).toContain('"revoked_at" is null');
    expect(where.params).toEqual(
      expect.arrayContaining(['student_001', 'self_study_summary']),
    );
  });

  /**
   * ⛔ **철회는 살아 있는 행을 전부 쓸어 가야 한다.** 부여 경합으로 `(student_id, type)` 에
   * 살아 있는 행이 둘이 될 수 있는데(읽기 쪽 `dedupeByChild` 주석 참조), 철회가 그중
   * **하나만** 찍으면 학생은 스위치가 꺼지는 걸 보고 공유가 끝난 줄 아는데 **남은 행으로
   * 학부모의 열람이 그대로 열려 있다.** 조용하고, 프라이버시 약속의 반대편이다.
   *
   * **응답으로는 이 고장을 볼 수 없다** — 한 줄만 찍어도 `revoked:true` 다(아래 두 번째
   * 테스트가 그 사실 자체를 박아 둔다). 그래서 여기서는 **술어**를 본다: 술어가 행을
   * 좁히지 않는 것이 「전부」를 만드는 유일한 장치다. 실제 행 수는 mock 이 셀 수 없으므로
   * 실 DB 왕복으로 따로 확인했다(살아 있는 2행 → DELETE 한 번 → 살아 있는 0행).
   */
  it('살아 있는 행이 둘이어도 한 번의 DELETE 가 **둘 다** 찍는다 — 술어가 행을 좁히지 않는다', async () => {
    // 부여 경합으로 살아 있는 동의가 둘이 된 상태.
    mockUpdateQueue = [[{ id: 'c_dup_a' }, { id: 'c_dup_b' }]];

    const res = await revokeConsent(
      req('student_001', 'student', { method: 'DELETE' }),
      ctx('self_study_summary'),
    );

    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ revoked: true });

    const where = render(whereSpy.mock.calls[0][0]);
    // 술어는 (명의 · 타입 · 살아 있음)뿐이다. **특정 행을 짚지 않는다** —
    // 「최신 것 하나만 골라 id 로 업데이트」 같은 최적화가 들어오면 여기서 깨진다.
    expect(where.text).not.toContain('"id" =');
    expect(where.text).toContain('"student_id" =');
    expect(where.text).toContain('"type" =');
    expect(where.text).toContain('"revoked_at" is null');
    // 한 행으로 좁히는 술어는 파라미터가 늘어난다 — 명의·타입 둘만 쓰는지 본다.
    expect(where.params).toEqual(['student_001', 'self_study_summary']);
  });

  it('응답만으로는 「하나만 찍힘」과 구분되지 않는다 — 그래서 위에서 술어를 본다', async () => {
    // 두 줄이 살아 있는데 한 줄만 찍힌 **고장난** 구현도 이 응답을 낸다.
    mockUpdateQueue = [[{ id: 'c_dup_a' }]];

    const res = await revokeConsent(
      req('student_001', 'student', { method: 'DELETE' }),
      ctx('self_study_summary'),
    );

    expect(await res.json()).toEqual({ revoked: true }); // 정상과 같은 몸통이다
  });

  it('철회가 쓸어 가는 범위 == 학부모가 볼 수 있는 범위 — 같은 술어라 틈이 없다', async () => {
    // 「철회는 못 닿는데 학부모에겐 보이는」 행이 생기지 않는 이유는, 두 곳이 같은
    // `livingConsent()` 를 쓰기 때문이다. 두 술어에서 그 조각이 같은지 직접 견준다.
    mockUpdateQueue = [[{ id: 'c1' }]];
    await revokeConsent(
      req('student_001', 'student', { method: 'DELETE' }),
      ctx('self_study_summary'),
    );
    const revokeWhere = render(whereSpy.mock.calls[0][0]).text;

    whereSpy.mockClear();
    joinSpy.mockClear();
    mockSelectQueue = [[{ role: 'parent' }], []];
    await getSelfStudy(req('parent_001', 'student'));
    const parentJoin = render(joinSpy.mock.calls[0][0]).text;

    const living = '"revoked_at" is null';
    const notExpired = '"expires_at" is null or';
    for (const text of [revokeWhere, parentJoin]) {
      expect(text).toContain(living);
      expect(text).toContain(notExpired);
      expect(text).toContain('now()');
    }
  });

  it('거둘 게 없어도 200 revoked:false — 의도는 이미 이뤄져 있다', async () => {
    mockUpdateQueue = [[]];

    const res = await revokeConsent(
      req('student_001', 'student', { method: 'DELETE' }),
      ctx('self_study_summary'),
    );

    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ revoked: false });
  });

  it.each([
    ['학생이 줄 수 없는 타입', 'emotion_share'],
    ['없는 타입', 'nonsense'],
    ['망가진 escape — 500 이 아니라 400', '%E0%A4%A'],
  ])('%s 는 400 이고 아무것도 고치지 않는다', async (_label, type) => {
    const res = await revokeConsent(
      req('student_001', 'student', { method: 'DELETE' }),
      ctx(type),
    );

    expect(res.status).toBe(400);
    expect(updateSetSpy).not.toHaveBeenCalled();
  });
});

describe('내 동의 목록 — 살아 있는 것만', () => {
  /** GET 은 보호자 조회와 동의 조회를 **동시에** 던진다(Promise.all) — 큐도 그 순서다. */
  const LINK = [{ id: 'parent_001', name: '어머니', relation: 'mother' }];

  it('조회 술어에 철회·만료 판정이 들어 있다', async () => {
    mockSelectQueue = [LINK, []];
    const res = await getConsents(req('student_001', 'student'));

    expect(res.status).toBe(200);
    // 마지막 where 가 동의 조회의 술어다(첫 번째는 링크 조회).
    const where = render(whereSpy.mock.calls[whereSpy.mock.calls.length - 1][0]);
    expect(where.text).toContain('"revoked_at" is null');
    expect(where.text).toContain('now()');
    expect(where.params).toContain('student_001');
  });

  it('동의 행에 받는 사람의 id 는 없다 — 본문으로 받지 않는 값이다', async () => {
    mockSelectQueue = [
      LINK,
      [
        {
          type: 'self_study_summary',
          scopeLabel: '계속',
          grantedAt: new Date('2026-09-03T00:00:00Z'),
          expiresAt: null,
        },
      ],
    ];

    const res = await getConsents(req('student_001', 'student'));
    const body = (await res.json()) as { consents: Array<Record<string, unknown>> };

    expect(Object.keys(body.consents[0]).sort()).toEqual([
      'expiresAt',
      'grantedAt',
      'scopeLabel',
      'type',
    ]);
  });

  it('보호자는 이름·관계만 싣는다 — id 는 떼고 나간다', async () => {
    mockSelectQueue = [LINK, []];

    const res = await getConsents(req('student_001', 'student'));
    const body = (await res.json()) as { parent: Record<string, unknown> | null };

    expect(body.parent).toEqual({ name: '어머니', relation: 'mother' });
    // id 가 새면 「그럼 보내도 되나」로 읽힌다 — 부여는 여전히 본문 parentId 를 거절한다.
    expect(body.parent).not.toHaveProperty('id');
  });

  it('링크가 없으면 parent 는 null — 화면이 스위치를 그리기 전에 안다', async () => {
    mockSelectQueue = [[], []];

    const res = await getConsents(req('s2', 'student'));
    const body = (await res.json()) as { parent: unknown; consents: unknown[] };

    expect(res.status).toBe(200);
    expect(body.parent).toBeNull();
    expect(body.consents).toEqual([]);
  });

  it('보호자를 고르는 순서가 부여 라우트와 같다 — 주 보호자 먼저', async () => {
    // 두 라우트가 같은 함수(`resolveGrantRecipient`)를 부르므로, 화면이 적은 이름과
    // 실제로 grant 가 갈 사람이 갈릴 수 없다. 그 함수를 직접 확인한다.
    mockSelectQueue = [LINK];
    const picked = await resolveGrantRecipient('student_001');
    expect(picked).toEqual({ id: 'parent_001', name: '어머니', relation: 'mother' });

    mockSelectQueue = [[]];
    expect(await resolveGrantRecipient('s2')).toBeNull();
  });
});

describe('기한은 범위 라벨에서 파생한다 — 클라이언트가 정하지 않는다', () => {
  const now = new Date('2026-09-03T06:00:00Z');

  it.each([
    ['계속', null],
    ['이번 달만', 30],
    ['이번 주만', 7],
  ] as const)('%s → %s일', (label, days) => {
    const at = expiryFor(label, now);
    if (days === null) {
      expect(at).toBeNull();
      return;
    }
    expect(at).not.toBeNull();
    expect((at as Date).getTime() - now.getTime()).toBe(days * 86_400_000);
  });

  it('세 라벨 말고는 받지 않는다', () => {
    expect(SCOPE_LABELS).toHaveLength(3);
    for (const label of SCOPE_LABELS) expect(isScopeLabel(label)).toBe(true);
    for (const bad of ['영원히', 'forever', '', null, 7]) {
      expect(isScopeLabel(bad)).toBe(false);
    }
  });
});

describe('연속일수 — 학생 화면(deriveStreak)과 같은 뜻이어야 한다', () => {
  // `lib/store/__tests__/self-learning.test.ts` 의 deriveStreak 케이스와 같은 입력·기대값.
  // 두 자리가 갈리면 학생과 부모가 같은 화면을 두고 다른 사실을 믿는다.
  it.each([
    ['빈 배열', [], 0, null],
    ['이어진 사흘', ['2026-09-01', '2026-09-02', '2026-09-03'], 3, '2026-09-03'],
    ['끊긴 뒤 이어진 이틀', ['2026-09-01', '2026-09-02', '2026-09-05', '2026-09-06'], 2, '2026-09-06'],
    ['마지막이 외따로', ['2026-09-01', '2026-09-02', '2026-09-09'], 1, '2026-09-09'],
    ['달을 넘는다', ['2026-08-31', '2026-09-01'], 2, '2026-09-01'],
    ['해를 넘는다', ['2025-12-31', '2026-01-01'], 2, '2026-01-01'],
  ])('%s', (_label, days, count, last) => {
    expect(deriveStreakFromDays(days as string[], '2026-09-09')).toMatchObject({
      count,
      lastStudyDate: last,
    });
  });

  it('정렬·중복에 기대지 않는다', () => {
    expect(
      deriveStreakFromDays(
        ['2026-09-03', '2026-09-01', '2026-09-02', '2026-09-03'],
        '2026-09-03',
      ),
    ).toMatchObject({ count: 3, lastStudyDate: '2026-09-03' });
  });

  it('오늘을 기준으로 삼지 않는다 — 어제까지 3일이면 오늘 안 해도 3', () => {
    expect(
      deriveStreakFromDays(['2026-09-01', '2026-09-02', '2026-09-03'], '2026-09-10'),
    ).toMatchObject({ count: 3 });
  });
});

describe('이번 주 공부한 날 — 월요일 시작(KST), 오늘까지', () => {
  it.each([
    ['월요일', '2026-08-31', '2026-08-31'],
    ['목요일', '2026-09-03', '2026-08-31'],
    ['일요일은 그 주의 끝이다', '2026-09-06', '2026-08-31'],
    ['다음 월요일은 새 주', '2026-09-07', '2026-09-07'],
  ])('%s(%s)의 주 시작은 %s', (_label, day, expected) => {
    expect(weekStart(day)).toBe(expected);
  });

  it('지난 주는 세지 않는다', () => {
    const days = ['2026-08-29', '2026-08-30', '2026-08-31', '2026-09-01'];
    // 오늘 = 목 2026-09-03 → 주 시작 월 08-31. 08-29·08-30 은 지난 주다.
    expect(deriveStreakFromDays(days, '2026-09-03').thisWeekDays).toBe(2);
  });

  it('아직 오지 않은 날은 세지 않는다', () => {
    const days = ['2026-08-31', '2026-09-01', '2026-09-05'];
    expect(deriveStreakFromDays(days, '2026-09-01').thisWeekDays).toBe(2);
  });

  it('꽉 채운 주는 7', () => {
    const week = [
      '2026-08-31',
      '2026-09-01',
      '2026-09-02',
      '2026-09-03',
      '2026-09-04',
      '2026-09-05',
      '2026-09-06',
    ];
    expect(deriveStreakFromDays(week, '2026-09-06').thisWeekDays).toBe(7);
  });
});
