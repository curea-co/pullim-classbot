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

  it('JWT 로 인증된 교사여도 학생 본인 표면은 403', async () => {
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
 * 이 두 경로를 학생·교사가 **함께 쓰는 표면**으로 정의한다. 그래서 여기서는 역할을 학생으로
 * 좁히지 않는다 — 좁히면 계약에 있는 교사 시점이 닫힌다.
 *
 * 이 PR 이 막는 것은 **개발용 신원 쿠키가 새로 데려온 역할**뿐이다. 교사 시점의 몸통
 * (owned 봇 · 출제한 과제)은 `dev` 에도 없고 이 PR 도 만들지 않으므로, 교사가 받는 응답은
 * `dev` 그대로다 — 그 자리는 교사 목록 PR 이 채운다.
 */
const SHARED_LISTS: [name: string, call: () => Promise<Response>][] = [
  ['GET /api/bots', () => botsGET(new Request('http://localhost/api/bots?role=teacher'))],
  [
    'GET /api/assignments',
    () => assignmentsGET(new Request('http://localhost/api/assignments?audience=teacher')),
  ],
];

describe.each(SHARED_LISTS)('%s — 학생·교사 공용 목록', (_name, call) => {
  const asRole = (role: string) =>
    getCurrentUserIdFromRequest.mockReturnValue({
      id: `uuid-${role}`,
      role,
      isAuthenticated: true,
      isIdentified: true,
    });

  // 이 PR 이 여기서 고치는 유일한 것.
  it('개발용 학부모 신원은 403 이고 DB 를 건드리지 않는다', async () => {
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

  it('admin 도 어느 시점의 주인이 아니라 403', async () => {
    asRole('admin');
    const res = await call();
    expect(res.status).toBe(403);
    expect(dbTouched).not.toHaveBeenCalled();
  });

  // 계약이 살아 있다는 뜻은 **가드가 막지 않는다**는 것이다. 그 뒤 응답은 이 PR 밖이다.
  it('교사는 막히지 않는다 — 계약에 있는 시점을 이 PR 이 닫지 않는다', async () => {
    asRole('teacher');
    await call().catch(() => undefined);
    expect(dbTouched).toHaveBeenCalled();
  });

  it('학생도 그대로 통과한다', async () => {
    asRole('student');
    await call().catch(() => undefined);
    expect(dbTouched).toHaveBeenCalled();
  });

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
});
