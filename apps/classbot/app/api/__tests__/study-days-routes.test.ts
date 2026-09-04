/**
 * @jest-environment node
 *
 * 공부한 날 라우트 단위 테스트 (자기주도 계약 §2).
 *
 * 담은 봇 테스트와 지키는 것이 겹치는 넷(명의는 신원에서만 · 미인증 401 · 멱등 ·
 * **학생만**)에 더해, 이 라우트에만 있는 넷을 본다:
 *  1. **「오늘」은 KST 다** — 서버 프로세스 TZ 가 UTC 여도 00:30 KST 는 그날이다.
 *     UTC 로 정했다면 매일 00:00~08:59 KST 에 공부한 학생의 날짜가 「미래」로 버려진다.
 *  2. **클라이언트가 주장할 수 있는 범위** — 형식·미래·2년 테두리. 백필은 그 값만 건너뛰고,
 *     날짜가 하나뿐인 기록 라우트는 400 으로 답한다.
 *  3. **`origin` 은 처음 쓴 쪽이 쓴다** — 백필은 `onConflictDoNothing` 이라 'app' 을 덮지 않고,
 *     삽입하는 행은 'backfill' 이다.
 *  4. **날짜는 캐스팅해서 읽는다** — `to_char(...)`. node-postgres 가 DATE 를 로컬시간
 *     `Date` 로 파싱하므로, 이 캐스팅이 빠지면 타입은 string 인데 런타임은 Date 다.
 *
 * DB 는 mock 이라 실 Postgres 없이 **가드 순서와 조립된 SQL** 만 본다. 실제 왕복(멱등·백필·
 * origin 보존)은 dev 서버에 curl 로 따로 확인했다.
 */
import { createHmac } from 'node:crypto';

import type { AccessTokenPayload } from '@pullim-classbot/types';
import { PgDialect } from 'drizzle-orm/pg-core';

// ── getDb mock — 담은 봇 테스트와 같은 thenable 체인 ──
const selectFieldsSpy = jest.fn();
const whereSpy = jest.fn();
const insertValuesSpy = jest.fn();
const conflictSpy = jest.fn();

let mockSelectQueue: unknown[][] = [];
let mockInsertQueue: unknown[][] = [];
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
    chain.onConflictDoNothing = (cfg: unknown) => {
      conflictSpy(cfg);
      return chain;
    };
    chain.returning = () => chain;
    chain.then = (resolve: (v: unknown[]) => unknown, reject: (e: unknown) => unknown) =>
      mockInsertError ? reject(mockInsertError) : resolve(mockInsertQueue.shift() ?? []);
    return chain;
  };

  const makeDb = (): Chain => ({
    select: (fields: unknown) => {
      selectFieldsSpy(fields);
      return selectChain();
    },
    insert: () => insertChain(),
  });

  return { getDb: () => makeDb() };
});

import { POST as backfillStudyDays } from '@/app/api/me/study-days/backfill/route';
import { GET as getStudyDays, POST as recordStudyDay } from '@/app/api/me/study-days/route';
import {
  MAX_BACKFILL_DAYS,
  backfillFloor,
  isDayKey,
  isRecordableDay,
  kstToday,
} from '@/app/api/_lib/study-date';

const SECRET = 'test-jwt-secret';

beforeAll(() => {
  process.env.JWT_SECRET = SECRET;
});

beforeEach(() => {
  selectFieldsSpy.mockClear();
  whereSpy.mockClear();
  insertValuesSpy.mockClear();
  conflictSpy.mockClear();
  mockSelectQueue = [];
  mockInsertQueue = [];
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
  return new Request('http://localhost/api/me/study-days', {
    ...init,
    headers: { authorization: `Bearer ${token}`, ...(init.headers ?? {}) },
  });
}

/** 신원이 전혀 없는 요청 — 데모 폴백이라 `isIdentified:false` 다. */
function anonReq(init: RequestInit = {}): Request {
  return new Request('http://localhost/api/me/study-days', init);
}

/**
 * `resolveActor` 가 읽는 도메인 `users.role` 한 줄 — **select 큐의 맨 앞**이다.
 * 역할 게이트가 붙으면서 세 경로 전부 이 조회를 먼저 한다.
 *
 * 큐를 비워 두면 `resolveActor` 는 **토큰 claim 의 role 로 떨어진다**(도메인 행이 아직
 * 없는 가입 직후 — `app/api/_lib/guards.ts`). 아래 테스트 중 이 줄을 안 넣은 것들은
 * `req(..., 'student')` 의 claim 으로 통과하는, 그 폴백 경로를 함께 지나간다.
 */
const actorRow = (role: 'student' | 'teacher' | 'parent'): unknown[] => [{ role }];

/** 조립된 술어를 실제 Postgres SQL 문자열로 펼친다. */
function render(sqlLike: unknown): { text: string; params: unknown[] } {
  const query = new PgDialect().sqlToQuery(
    sqlLike as Parameters<PgDialect['sqlToQuery']>[0],
  );
  return { text: query.sql, params: query.params };
}

/** `'YYYY-MM-DD'` 에 며칠을 더한다(테스트가 오늘에 매이지 않게). */
function shiftDay(key: string, delta: number): string {
  const [y, m, d] = key.split('-').map(Number);
  const at = new Date(Date.UTC(y, m - 1, d) + delta * 86_400_000);
  const mm = String(at.getUTCMonth() + 1).padStart(2, '0');
  const dd = String(at.getUTCDate()).padStart(2, '0');
  return `${at.getUTCFullYear()}-${mm}-${dd}`;
}

const TODAY = kstToday();
const TOMORROW = shiftDay(TODAY, 1);
const YESTERDAY = shiftDay(TODAY, -1);

describe('「오늘」은 KST 다 — 서버 TZ 가 아니라', () => {
  it.each([
    // UTC 로 봤다면 전날(09-02)이다. 그 하루가 한국 학생에게는 **이미 오늘**이라,
    // UTC 로 정하면 00:00~08:59 KST 에 공부한 날짜가 매일 「미래」로 버려진다.
    ['00:30 KST', '2026-09-02T15:30:00Z', '2026-09-03'],
    // 브라우저 로컬 자정과 KST 자정이 같은 자리에 있는지 — 23:50 은 아직 그날이다.
    ['23:50 KST', '2026-09-03T14:50:00Z', '2026-09-03'],
    // 자정 정각은 새 날의 첫 순간.
    ['00:00 KST', '2026-09-03T15:00:00Z', '2026-09-04'],
  ])('%s → %s', (_label, instant, expected) => {
    expect(kstToday(new Date(instant))).toBe(expected);
  });

  it('프로세스 TZ 를 읽지 않는다 — 타임존을 환경에 맡기면 배포지가 하루의 경계를 정한다', () => {
    // Intl 에 timeZone 을 명시하므로 어떤 순간이든 KST 한 값이다.
    const instant = new Date('2026-01-01T00:00:00Z'); // 09:00 KST 1/1
    expect(kstToday(instant)).toBe('2026-01-01');
  });
});

describe('날짜 판정 — 클라이언트가 주장할 수 있는 범위', () => {
  it.each([
    ['형식이 어긋남', '2026-9-3'],
    ['달력에 없는 날', '2026-02-30'],
    ['13월', '2026-13-01'],
    ['시각이 붙음', '2026-09-03T00:00:00Z'],
    ['빈 문자열', ''],
    ['문자열이 아님', 20260903],
    ['null', null],
  ])('%s 는 날짜 키가 아니다', (_label, value) => {
    expect(isDayKey(value)).toBe(false);
  });

  it('멀쩡한 날짜는 통과한다', () => {
    expect(isDayKey('2026-09-03')).toBe(true);
    expect(isDayKey('2024-02-29')).toBe(true); // 윤년
  });

  it('하한은 오늘로부터 2년', () => {
    expect(backfillFloor('2026-09-03')).toBe('2024-09-03');
  });

  it('미래는 받지 않고, 하한 하루 전도 받지 않는다', () => {
    const today = '2026-09-03';
    expect(isRecordableDay(today, today)).toBe(true);
    expect(isRecordableDay('2026-09-04', today)).toBe(false); // 내일
    expect(isRecordableDay('2024-09-03', today)).toBe(true); // 하한 당일
    expect(isRecordableDay('2024-09-02', today)).toBe(false); // 하한 하루 전
  });
});

describe('미인증은 401 — 세 경로 모두', () => {
  it('GET', async () => {
    const res = await getStudyDays(anonReq());
    expect(res.status).toBe(401);
    expect(((await res.json()) as { code?: string }).code).toBe('AUTH_REQUIRED');
  });

  it('POST — 본문을 읽기도 전에 막는다', async () => {
    const res = await recordStudyDay(
      anonReq({ method: 'POST', body: JSON.stringify({ date: YESTERDAY }) }),
    );
    expect(res.status).toBe(401);
    expect(insertValuesSpy).not.toHaveBeenCalled();
  });

  it('백필', async () => {
    const res = await backfillStudyDays(
      anonReq({ method: 'POST', body: JSON.stringify({ days: [YESTERDAY] }) }),
    );
    expect(res.status).toBe(401);
    expect(insertValuesSpy).not.toHaveBeenCalled();
  });

  it('신원이 없으면 역할을 읽으러 가지도 않는다', async () => {
    await getStudyDays(anonReq());
    expect(whereSpy).not.toHaveBeenCalled();
  });
});

describe('명의는 신원에서만 — 본문은 믿지 않는다', () => {
  it('POST 는 토큰 주인으로 쓴다(본문의 studentId 를 무시)', async () => {
    mockSelectQueue = [actorRow('student')];
    mockInsertQueue = [[{ studentId: 's2' }]];

    const res = await recordStudyDay(
      req('s2', 'student', {
        method: 'POST',
        body: JSON.stringify({ date: YESTERDAY, studentId: 'student_001' }),
      }),
    );

    expect(res.status).toBe(201);
    expect(insertValuesSpy).toHaveBeenCalledWith({
      studentId: 's2',
      studyDate: YESTERDAY,
      origin: 'app',
    });
  });

  it('백필도 토큰 주인으로 쓴다', async () => {
    mockSelectQueue = [actorRow('student')];
    mockInsertQueue = [[{ studentId: 's2' }]];

    await backfillStudyDays(
      req('s2', 'student', {
        method: 'POST',
        body: JSON.stringify({ days: [YESTERDAY], studentId: 'student_001' }),
      }),
    );

    expect(insertValuesSpy).toHaveBeenCalledWith([
      { studentId: 's2', studyDate: YESTERDAY, origin: 'backfill' },
    ]);
  });

  it('GET 은 내 행만 — 조회 술어에 토큰 주인이 들어간다', async () => {
    mockSelectQueue = [actorRow('student'), []];

    await getStudyDays(req('s2', 'student'));

    // 0번째는 `resolveActor` 의 users 조회다. 공부한 날의 술어는 그다음.
    const { params } = render(whereSpy.mock.calls[1][0]);
    expect(params).toEqual(['s2']);
  });
});

describe('GET /api/me/study-days', () => {
  it('200 { days } — 오름차순 그대로', async () => {
    mockSelectQueue = [
      actorRow('student'),
      [{ day: '2026-08-28' }, { day: '2026-09-01' }],
    ];

    const res = await getStudyDays(req('student_001', 'student'));

    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ days: ['2026-08-28', '2026-09-01'] });
  });

  it('날짜를 **캐스팅해서** 읽는다 — 이 to_char 가 빠지면 런타임이 Date 로 돌아온다', () => {
    mockSelectQueue = [actorRow('student'), []];

    return getStudyDays(req('student_001', 'student')).then(() => {
      // 0번째는 `resolveActor` 의 users 조회다. 공부한 날의 칸은 그다음.
      const fields = selectFieldsSpy.mock.calls[1][0] as { day: unknown };
      const { text } = render(fields.day);
      expect(text).toContain('to_char');
      expect(text).toContain('YYYY-MM-DD');
    });
  });
});

describe('POST /api/me/study-days — 멱등 기록', () => {
  it('본문이 아예 없으면 **서버의 오늘(KST)** 로 기록한다', async () => {
    mockInsertQueue = [[{ studentId: 'student_001' }]];

    const res = await recordStudyDay(req('student_001', 'student', { method: 'POST' }));

    expect(res.status).toBe(201);
    expect(await res.json()).toEqual({ recorded: true, date: TODAY });
    expect(insertValuesSpy).toHaveBeenCalledWith({
      studentId: 'student_001',
      studyDate: TODAY,
      origin: 'app',
    });
  });

  it('빈 객체 본문도 같다 — 본문 자체가 선택 사항이다', async () => {
    mockInsertQueue = [[{ studentId: 'student_001' }]];

    const res = await recordStudyDay(
      req('student_001', 'student', { method: 'POST', body: '{}' }),
    );

    expect(res.status).toBe(201);
    expect(await res.json()).toEqual({ recorded: true, date: TODAY });
  });

  it('이미 있는 날이면 201 이 아니라 200 — 몸통은 같다', async () => {
    mockInsertQueue = [[]]; // onConflictDoNothing 이 흡수

    const res = await recordStudyDay(
      req('student_001', 'student', {
        method: 'POST',
        body: JSON.stringify({ date: YESTERDAY }),
      }),
    );

    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ recorded: true, date: YESTERDAY });
  });

  it('충돌 대상은 (student_id, study_date) 짝 — 하루 한 줄', async () => {
    mockInsertQueue = [[{ studentId: 'student_001' }]];

    await recordStudyDay(req('student_001', 'student', { method: 'POST' }));

    const cfg = conflictSpy.mock.calls[0][0] as { target: unknown[] };
    expect(cfg.target).toHaveLength(2);
  });

  it.each([
    ['내일(KST)', () => TOMORROW],
    ['2년보다 오래된 날', () => '2019-05-05'],
    ['달력에 없는 날', () => '2026-02-30'],
    ['형식이 어긋난 값', () => '20260903'],
  ])('%s → 400 (쓰지 않는다)', async (_label, dateOf) => {
    const res = await recordStudyDay(
      req('student_001', 'student', {
        method: 'POST',
        body: JSON.stringify({ date: dateOf() }),
      }),
    );

    // 값이 하나뿐이라 조용히 건너뛰지 않는다 — `recorded:true` 를 주고 아무것도 안 남기면
    // 부르는 쪽이 기록된 줄 안다.
    expect(res.status).toBe(400);
    expect(((await res.json()) as { code?: string }).code).toBe('INVALID_INPUT');
    expect(insertValuesSpy).not.toHaveBeenCalled();
  });

  it('본문이 JSON 이 아니면 400 — 「못 읽었으니 오늘」로 뭉개지 않는다', async () => {
    const res = await recordStudyDay(
      req('student_001', 'student', { method: 'POST', body: 'not json' }),
    );

    expect(res.status).toBe(400);
    expect(insertValuesSpy).not.toHaveBeenCalled();
  });

  it('쓰기가 실패해도 500 을 흘리지 않는다(없는 신원 등 FK 위반)', async () => {
    mockInsertError = new Error('violates foreign key constraint');

    const res = await recordStudyDay(req('student_001', 'student', { method: 'POST' }));

    expect(res.status).toBe(400);
    expect(((await res.json()) as { code?: string }).code).toBe('INVALID_INPUT');
  });
});

describe('POST /api/me/study-days/backfill — 학생 기기의 주장에 테두리를 친다', () => {
  it('걸러진 값은 건너뛸 뿐 전체를 400 으로 되돌리지 않는다', async () => {
    mockInsertQueue = [[{ studentId: 'student_001' }, { studentId: 'student_001' }]];

    const res = await backfillStudyDays(
      req('student_001', 'student', {
        method: 'POST',
        body: JSON.stringify({
          days: [
            YESTERDAY,
            shiftDay(TODAY, -2),
            'not-a-date',
            '2026-02-30',
            TOMORROW,
            '2019-05-05',
            YESTERDAY, // 요청 안의 중복
          ],
        }),
      }),
    );

    expect(res.status).toBe(200);
    // 보낸 7개 중 새로 생긴 2개를 뺀 나머지가 skipped — 이유를 갈라 세지 않는다.
    expect(await res.json()).toEqual({ inserted: 2, skipped: 5 });
    // 걸러진 값과 중복은 문장에 들어가지도 않는다.
    expect(insertValuesSpy).toHaveBeenCalledWith([
      { studentId: 'student_001', studyDate: YESTERDAY, origin: 'backfill' },
      { studentId: 'student_001', studyDate: shiftDay(TODAY, -2), origin: 'backfill' },
    ]);
  });

  it('넣는 행의 origin 은 backfill — 그리고 이미 있는 날은 덮지 않는다', async () => {
    mockInsertQueue = [[{ studentId: 'student_001' }]];

    await backfillStudyDays(
      req('student_001', 'student', {
        method: 'POST',
        body: JSON.stringify({ days: [YESTERDAY] }),
      }),
    );

    const values = insertValuesSpy.mock.calls[0][0] as Array<{ origin: string }>;
    expect(values.every((v) => v.origin === 'backfill')).toBe(true);
    // 'app' 을 'backfill' 로 되돌리지 않는 자리가 여기다 — DoUpdate 였다면 서버가 목격한
    // 기록이 나중에 올라온 전언으로 바뀐다.
    expect(conflictSpy).toHaveBeenCalledTimes(1);
  });

  it(`${MAX_BACKFILL_DAYS}개까지는 받고, 넘으면 400 — 잘라서 받지 않는다`, async () => {
    const many = (n: number): string[] =>
      Array.from({ length: n }, (_, i) => shiftDay(TODAY, -i));

    mockInsertQueue = [[]];
    const ok = await backfillStudyDays(
      req('student_001', 'student', {
        method: 'POST',
        body: JSON.stringify({ days: many(MAX_BACKFILL_DAYS) }),
      }),
    );
    expect(ok.status).toBe(200);

    insertValuesSpy.mockClear();
    const tooMany = await backfillStudyDays(
      req('student_001', 'student', {
        method: 'POST',
        body: JSON.stringify({ days: many(MAX_BACKFILL_DAYS + 1) }),
      }),
    );
    expect(tooMany.status).toBe(400);
    expect(((await tooMany.json()) as { code?: string }).code).toBe('INVALID_INPUT');
    // 상한을 넘긴 요청은 **한 줄도** 쓰지 않는다.
    expect(insertValuesSpy).not.toHaveBeenCalled();
  });

  it('빈 배열은 200 { 0, 0 } — 문장을 만들지 않는다(빈 VALUES 는 SQL 오류다)', async () => {
    const res = await backfillStudyDays(
      req('student_001', 'student', {
        method: 'POST',
        body: JSON.stringify({ days: [] }),
      }),
    );

    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ inserted: 0, skipped: 0 });
    expect(insertValuesSpy).not.toHaveBeenCalled();
  });

  it('전부 걸러지는 배치도 200 — 보낸 만큼 skipped', async () => {
    const res = await backfillStudyDays(
      req('student_001', 'student', {
        method: 'POST',
        body: JSON.stringify({ days: [TOMORROW, '2019-01-01', 'nope', 42, null] }),
      }),
    );

    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ inserted: 0, skipped: 5 });
    expect(insertValuesSpy).not.toHaveBeenCalled();
  });

  it.each([
    ['days 가 배열이 아님', '{"days":"2026-09-01"}'],
    ['days 없음', '{}'],
    ['본문이 JSON 이 아님', 'not json'],
  ])('%s → 400', async (_label, body) => {
    const res = await backfillStudyDays(
      req('student_001', 'student', { method: 'POST', body }),
    );

    expect(res.status).toBe(400);
    expect(insertValuesSpy).not.toHaveBeenCalled();
  });
});

describe('학생만 — 자기주도는 역할이 아니라 학생의 하위 컨텍스트다', () => {
  it('교사 신원의 GET 은 403 — 기록을 읽으러 가지도 않는다', async () => {
    mockSelectQueue = [actorRow('teacher')];

    const res = await getStudyDays(req('teacher_001', 'teacher'));

    expect(res.status).toBe(403);
    expect(((await res.json()) as { code?: string }).code).toBe('FORBIDDEN_ROLE');
    // users 조회 하나로 끝난다 — self_study_days 는 건드리지 않는다.
    expect(whereSpy).toHaveBeenCalledTimes(1);
  });

  it('교사 신원의 기록은 403 — 교사 명의의 연속 학습이 쌓이지 않는다', async () => {
    mockSelectQueue = [actorRow('teacher')];

    const res = await recordStudyDay(
      req('teacher_001', 'teacher', { method: 'POST' }),
    );

    expect(res.status).toBe(403);
    expect(insertValuesSpy).not.toHaveBeenCalled();
  });

  it('백필도 403 — 기록만 막고 여기를 열어 두면 게이트가 없는 것과 같다', async () => {
    mockSelectQueue = [actorRow('teacher')];

    const res = await backfillStudyDays(
      req('teacher_001', 'teacher', {
        method: 'POST',
        body: JSON.stringify({ days: [YESTERDAY] }),
      }),
    );

    expect(res.status).toBe(403);
    expect(insertValuesSpy).not.toHaveBeenCalled();
  });

  it('학부모 신원도 403 — 토큰에 없는 역할이라 도메인 users 행으로만 갈린다', async () => {
    mockSelectQueue = [actorRow('parent')];

    // 토큰 claim 은 student 다(공유 UserRole 에 parent 가 없다).
    const res = await recordStudyDay(
      req('parent_001', 'student', { method: 'POST' }),
    );

    expect(res.status).toBe(403);
    expect(insertValuesSpy).not.toHaveBeenCalled();
  });

  it('역할의 권위는 **도메인 users.role** — 토큰이 student 라도 그 행이 teacher 면 막힌다', async () => {
    mockSelectQueue = [actorRow('teacher')];

    const res = await recordStudyDay(
      req('teacher_001', 'student', { method: 'POST' }),
    );

    expect(res.status).toBe(403);
    expect(insertValuesSpy).not.toHaveBeenCalled();
  });
});
