/**
 * @jest-environment node
 *
 * 학생 **본인** 표면(`/api/*`)의 역할 가드.
 *
 * 개발용 신원 쿠키가 생기면서 서버가 돌려주는 role 이 셋(학생·교사·학부모)이 됐다.
 * 「누구인지 안다」(`isIdentified`)만 물으면 **학부모 명의로 학생 자료 표면**에 들어와
 * 200/빈 목록을 받는다 — 「자료가 없다」와 「그 역할은 볼 수 없다」가 뒤섞인다.
 * 여기서는 세 갈래를 못박는다: 신원 없음 401 · 학생 아님 403 · DB 는 손도 대지 않음.
 *
 * 학부모의 자녀 열람은 이 표면이 아니라 `/parent/*` 에서 자녀 매칭·동의를 거쳐 온다
 * (`proc/spec/05 § 11.2` · `§ 11.4`).
 */

// 가드에서 걸리면 DB 로 내려가지 않는다 — 그 사실 자체를 이 스파이로 검증한다.
const dbTouched = jest.fn();
jest.mock('@/lib/db', () => ({
  getDb: () => {
    dbTouched();
    return {};
  },
  schema: {},
}));

jest.mock('@/lib/db/schema', () => ({
  assignments: {},
  chatMessages: {},
  classBots: {},
  emotionCheckIns: {},
  enrollments: {},
  gradingHistory: {},
  users: {},
  wellbeingSnapshots: {},
}));

const getCurrentUserIdFromRequest = jest.fn<
  { id: string; role: string; isAuthenticated: boolean; isIdentified: boolean },
  [Request]
>();
jest.mock('@/lib/current-user', () => ({
  getCurrentUserIdFromRequest: (req: Request) => getCurrentUserIdFromRequest(req),
}));

import { GET as assignmentGET } from '@/app/api/assignments/[id]/route';
import { GET as assignmentsGET } from '@/app/api/assignments/route';
import { GET as botsGET } from '@/app/api/bots/route';
import { POST as chatPOST } from '@/app/api/chat/route';
import { GET as gradesGET } from '@/app/api/grades/route';
import { GET as wellnessGET } from '@/app/api/wellness/route';

/** 라우트마다 인자 모양이 달라(단건 조회는 `ctx.params`) 호출을 여기서 흡수한다. */
const SELF_ROUTES: [name: string, call: () => Promise<Response>][] = [
  ['GET /api/bots', () => botsGET(new Request('http://localhost/api/bots'))],
  ['GET /api/assignments', () => assignmentsGET(new Request('http://localhost/api/assignments'))],
  [
    'GET /api/assignments/[id]',
    () =>
      assignmentGET(new Request('http://localhost/api/assignments/a1'), {
        params: Promise.resolve({ id: 'a1' }),
      }),
  ],
  ['GET /api/grades', () => gradesGET(new Request('http://localhost/api/grades'))],
  ['GET /api/wellness', () => wellnessGET(new Request('http://localhost/api/wellness'))],
  [
    'POST /api/chat',
    () =>
      chatPOST(
        new Request('http://localhost/api/chat', {
          method: 'POST',
          body: JSON.stringify({ botId: 'cb_1', text: '안녕' }),
          headers: { 'content-type': 'application/json' },
        }),
      ),
  ],
];

beforeEach(() => jest.clearAllMocks());

describe.each(SELF_ROUTES)('%s — 학생 본인 표면', (_name, call) => {
  it('신원이 없으면 401', async () => {
    getCurrentUserIdFromRequest.mockReturnValue({
      id: 'student_001',
      role: 'student',
      isAuthenticated: false,
      isIdentified: false,
    });
    const res = await call();
    expect(res.status).toBe(401);
    expect(dbTouched).not.toHaveBeenCalled();
  });

  // 이 케이스가 이 파일의 존재 이유다 — 개발용 학부모 신원(`parent_001`)은
  // `isIdentified: true` 라 역할 가드가 없으면 그대로 통과한다.
  it('개발용 학부모 신원이면 403 이고 DB 를 건드리지 않는다', async () => {
    getCurrentUserIdFromRequest.mockReturnValue({
      id: 'parent_001',
      role: 'parent',
      isAuthenticated: false,
      isIdentified: true,
    });
    const res = await call();
    expect(res.status).toBe(403);
    expect(await res.json()).toMatchObject({ code: 'FORBIDDEN_ROLE' });
    expect(dbTouched).not.toHaveBeenCalled();
  });

  // 시점을 안 적으면 학생 시점이다 — 공용 목록 둘도 여기서는 학생 것으로 판정된다.
  it('시점을 안 적은 교사는 학생 시점으로 판정돼 403', async () => {
    getCurrentUserIdFromRequest.mockReturnValue({
      id: 'uuid-teacher',
      role: 'teacher',
      isAuthenticated: true,
      isIdentified: true,
    });
    const res = await call();
    expect(res.status).toBe(403);
    expect(dbTouched).not.toHaveBeenCalled();
  });

  // 학생은 가드를 지나 DB 로 내려간다. 여기 스텁은 빈 객체라 그 뒤에서 터지는데,
  // 「가드를 통과했다」는 그 도달 자체로 증명된다(401·403 이 아니다).
  it('학생이면 가드를 지나 조회까지 내려간다', async () => {
    getCurrentUserIdFromRequest.mockReturnValue({
      id: 'student_001',
      role: 'student',
      isAuthenticated: false,
      isIdentified: true,
    });
    await call().catch(() => undefined);
    expect(dbTouched).toHaveBeenCalled();
  });
});

/**
 * 공용 목록 둘 — 스펙 § 4.2 `GET /api/bots?role=` · § 4.5 `GET /api/assignments?audience=` 는
 * 이 두 경로를 학생·교사가 **시점으로 나눠 쓰는 표면**으로 정의한다. 가드가 역할을 학생으로
 * 못박으면 그 계약이 사라지므로, 시점을 읽고 **그 시점의 주인인지**만 본다.
 *
 * 교사 시점의 몸통은 아직 없다. 그래서 403(권한 없음)이 아니라 501(아직 없음)이다 —
 * 그 둘을 뭉개면 교사 화면이 붙는 날 무엇이 막힌 것인지 알 수 없다.
 */
const SHARED_LISTS: [name: string, param: string, call: (url: string) => Promise<Response>][] = [
  ['GET /api/bots', 'role', (url) => botsGET(new Request(url))],
  ['GET /api/assignments', 'audience', (url) => assignmentsGET(new Request(url))],
];

describe.each(SHARED_LISTS)('%s — 학생·교사 공용 목록', (name, param, call) => {
  const base = `http://localhost${name.split(' ')[1]}`;

  const asRole = (role: string) =>
    getCurrentUserIdFromRequest.mockReturnValue({
      id: `uuid-${role}`,
      role,
      isAuthenticated: true,
      isIdentified: true,
    });

  it('교사가 교사 시점을 부르면 403 이 아니라 501 — 계약은 살아 있다', async () => {
    asRole('teacher');
    const res = await call(`${base}?${param}=teacher`);
    expect(res.status).toBe(501);
    expect(await res.json()).toMatchObject({ code: 'NOT_IMPLEMENTED' });
    expect(dbTouched).not.toHaveBeenCalled();
  });

  it('학생이 교사 시점을 부르면 403 — 남의 시점은 못 받는다', async () => {
    asRole('student');
    const res = await call(`${base}?${param}=teacher`);
    expect(res.status).toBe(403);
    expect(dbTouched).not.toHaveBeenCalled();
  });

  it('교사가 학생 시점을 부르면 403', async () => {
    asRole('teacher');
    const res = await call(`${base}?${param}=student`);
    expect(res.status).toBe(403);
    expect(dbTouched).not.toHaveBeenCalled();
  });

  it('학생이 학생 시점을 부르면 가드를 지나 조회까지 내려간다', async () => {
    asRole('student');
    await call(`${base}?${param}=student`).catch(() => undefined);
    expect(dbTouched).toHaveBeenCalled();
  });

  it('학부모는 어느 시점의 주인도 아니라 403', async () => {
    asRole('parent');
    const res = await call(`${base}?${param}=teacher`);
    expect(res.status).toBe(403);
    expect(dbTouched).not.toHaveBeenCalled();
  });

  it('모르는 시점 값은 400 — 조용히 학생으로 떨어뜨리지 않는다', async () => {
    asRole('student');
    const res = await call(`${base}?${param}=principal`);
    expect(res.status).toBe(400);
    expect(await res.json()).toMatchObject({ code: 'INVALID_AUDIENCE' });
    expect(dbTouched).not.toHaveBeenCalled();
  });
});
