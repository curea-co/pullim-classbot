/**
 * @jest-environment node
 *
 * 기초 읽기 API 라우트 가드 단위 테스트 (plan Phase 7 Stage 1).
 *
 * 핵심(D1 로그인월):
 *  - 신원이 없으면 **401**(mock 폴백 없음 — 익명 도메인 읽기 차단).
 *  - 신원이 있으면 **200** + 본인 명의로만 DB 조회.
 *
 * 신원은 **개발용 신원 쿠키**(`lib/dev-identity.ts`)로 세운다. 클래스봇 자체 인증이 걷히며
 * `Authorization: Bearer` 검증 경로가 없어졌다 — route handler 가 세울 수 있는 신원은
 * 이것뿐이다(`lib/current-user.ts` 주석 · `05 § 11.1`).
 *
 * DB 는 mock(jest)으로 대체해 실 Postgres 없이 가드/명의 격리만 검증한다.
 */
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

beforeEach(() => {
  whereSpy.mockClear();
  mockRows = [{ id: 'cb_001' }];
});

/**
 * 개발용 신원이 인정되는 호스트 — `lib/dev-identity.ts` 허용 목록 안의 이름이다.
 *
 * **명시해야 한다.** `new Request(url)` 은 `Host` 헤더를 만들어 주지 않아
 * `req.headers.get('host')` 가 `null` 이고, 신원 판정은 **모르면 닫는다**(fail-closed).
 */
const DEV_HOST = 'localhost:3032';

/** 개발용 신원 쿠키를 실은 학생 요청. */
function studentReq(): Request {
  return new Request('http://localhost/api/x', {
    headers: { cookie: 'pullim_dev_identity=student_001', host: DEV_HOST },
  });
}

describe.each([
  ['GET /api/bots', getBots],
  ['GET /api/assignments', getAssignments],
  ['GET /api/grades', getGrades],
])('%s', (_name, handler) => {
  it('신원이 없으면 401 (로그인월 — mock 폴백 없음)', async () => {
    const res = await handler(new Request('http://localhost/api/x'));
    expect(res.status).toBe(401);
    const body = (await res.json()) as { code?: string };
    expect(body.code).toBe('AUTH_REQUIRED');
    // 미인증이면 DB 조회 자체를 하지 않는다.
    expect(whereSpy).not.toHaveBeenCalled();
  });

  it('신원이 있으면 200 + 본인 명의로 DB 조회', async () => {
    const res = await handler(studentReq());
    expect(res.status).toBe(200);
    // where 가 호출됐다 = 명의 필터를 거쳐 조회했다.
    expect(whereSpy).toHaveBeenCalled();
  });
});

describe('GET /api/assignments/[id]', () => {
  const ctx = { params: Promise.resolve({ id: 'as_today' }) };

  it('신원이 없으면 401 (DB 조회 없음)', async () => {
    const res = await getAssignmentById(new Request('http://localhost/api/x'), ctx);
    expect(res.status).toBe(401);
    expect(whereSpy).not.toHaveBeenCalled();
  });

  it('신원 + 본인 명의 행 있으면 200 { assignment }', async () => {
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
