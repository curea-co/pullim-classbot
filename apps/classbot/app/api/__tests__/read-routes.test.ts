/**
 * @jest-environment node
 *
 * 기초 읽기 API 라우트 가드 단위 테스트 (plan Phase 7 Stage 1).
 *
 * 핵심(D1 로그인월):
 *  - 토큰 없으면 **401**(mock 폴백 없음 — 익명 도메인 읽기 차단).
 *  - 올바르게 서명된 토큰이면 **200** + 본인 명의(studentId=claim.sub)로만 DB 조회.
 *
 * DB 는 mock(jest)으로 대체해 실 Postgres 없이 가드/명의 격리만 검증한다.
 */
import { createHmac } from 'node:crypto';

import type { AccessTokenPayload } from '@pullim-classbot/types';

// ── getDb mock — 쿼리 빌더 체인을 추적 가능한 가짜로 대체 ──
const whereSpy = jest.fn();
// 조회 결과 행 — 테스트가 가변으로 바꿔 404(빈 배열) 등을 검증한다(jest factory 규칙상 `mock` 접두).
let mockRows: unknown[] = [{ id: 'cb_001' }];

jest.mock('@/lib/db', () => {
  // 체인: select().from().innerJoin?().where().orderBy?().limit?() → Promise(rows)
  const makeChain = () => {
    const chain: Record<string, unknown> = {};
    const ret = () => chain;
    chain.select = ret;
    chain.from = ret;
    chain.innerJoin = ret;
    chain.where = (...args: unknown[]) => {
      whereSpy(...args);
      return chain;
    };
    chain.orderBy = ret;
    chain.limit = ret;
    // thenable — await 시 현재 mockRows 반환
    chain.then = (resolve: (v: unknown[]) => unknown) => resolve(mockRows);
    return chain;
  };
  return { getDb: () => makeChain() };
});

import { GET as getBots } from '@/app/api/bots/route';
import { GET as getAssignments } from '@/app/api/assignments/route';
import { GET as getAssignmentById } from '@/app/api/assignments/[id]/route';
import { GET as getGrades } from '@/app/api/grades/route';

const SECRET = 'test-jwt-secret';

beforeAll(() => {
  process.env.JWT_SECRET = SECRET;
});

beforeEach(() => {
  whereSpy.mockClear();
  mockRows = [{ id: 'cb_001' }];
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

function studentReq(): Request {
  const token = signToken({
    sub: 'student_001',
    email: 's@example.com',
    role: 'student',
    type: 'access',
    jti: 'j1',
    exp: Math.floor(Date.now() / 1000) + 3600,
  });
  return new Request('http://localhost/api/x', {
    headers: { authorization: `Bearer ${token}` },
  });
}

describe.each([
  ['GET /api/bots', getBots],
  ['GET /api/assignments', getAssignments],
  ['GET /api/grades', getGrades],
])('%s', (_name, handler) => {
  it('토큰이 없으면 401 (로그인월 — mock 폴백 없음)', async () => {
    const res = await handler(new Request('http://localhost/api/x'));
    expect(res.status).toBe(401);
    const body = (await res.json()) as { code?: string };
    expect(body.code).toBe('AUTH_REQUIRED');
    // 미인증이면 DB 조회 자체를 하지 않는다.
    expect(whereSpy).not.toHaveBeenCalled();
  });

  it('서명된 토큰이면 200 + 본인 명의로 DB 조회', async () => {
    const res = await handler(studentReq());
    expect(res.status).toBe(200);
    // where 가 호출됐다 = 명의 필터를 거쳐 조회했다.
    expect(whereSpy).toHaveBeenCalled();
  });
});

describe('GET /api/assignments/[id]', () => {
  const ctx = { params: Promise.resolve({ id: 'as_today' }) };

  it('토큰이 없으면 401 (DB 조회 없음)', async () => {
    const res = await getAssignmentById(new Request('http://localhost/api/x'), ctx);
    expect(res.status).toBe(401);
    expect(whereSpy).not.toHaveBeenCalled();
  });

  it('서명된 토큰 + 본인 명의 행 있으면 200 { assignment }', async () => {
    const res = await getAssignmentById(studentReq(), ctx);
    expect(res.status).toBe(200);
    expect(whereSpy).toHaveBeenCalled();
    const body = (await res.json()) as { assignment?: { id?: string } };
    expect(body.assignment?.id).toBe('cb_001');
  });

  it('본인 명의 행이 없으면 404 (존재 노출 차단)', async () => {
    mockRows = [];
    const res = await getAssignmentById(studentReq(), ctx);
    expect(res.status).toBe(404);
    const body = (await res.json()) as { code?: string };
    expect(body.code).toBe('NOT_FOUND');
  });
});
