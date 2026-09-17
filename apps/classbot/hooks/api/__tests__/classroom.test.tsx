/**
 * 수업방 훅 — pullim-api 정본을 OS 쿠키로 친다(2026-09-16 계획 PR 4 · 5a · 5b).
 *
 * `fetch` 를 통째로 가로채 **HTTP 를 상대로** 본다 — URL·메서드·본문·CSRF·credentials 가 정본 계약
 * (`POST /classbot/enrollments`·`GET /classbot/bots?role=`·`POST /classbot/classes`·`GET …/members`·`PUT …/bot`)과
 * 어긋나면 여기서 걸린다. 목 폴백이 없다는 것도 여기서 못박는다 — 404 는 「없는 코드」로 끝나고 다른 문을 두드리지 않는다.
 *
 * 5b 가 더한 것: 반 만들기 응답의 `class` 가 반 상세 캐시에 서는 것 · 명단 읽기 · 봇 할당이 `PUT` 으로 가고
 * `null` 이 떼기인 것 · 새 코드가 그 캐시의 `joinCode` 를 갈아 끼우는 것.
 *
 * 5d 가 바꾼 것: 그 캐시가 이제 **읽기 문**이다(`GET /classbot/classes/:classId` · `useClassDetail` · pullim-api #672).
 * 종전에는 쓰기 응답만 들어오는 `enabled:false` 쿼리라 「이 세션이 손대지 않은 반은 영영 모른다」였다 — 이제 묻고,
 * 쓰기 응답은 같은 자리를 **갈아 끼운다**(키에 신원 꼬리가 붙어 `setQueriesData` 로 접두사 매칭한다).
 */
import type { ReactNode } from 'react';
import { act, renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

let authUser: { id: string } | null = { id: 'sub-1' };
let authReady = true;
jest.mock('@/lib/auth/auth-context', () => ({
  useAuth: () => ({ user: authUser, isReady: authReady }),
}));

const redirectToOsLogin = jest.fn();
jest.mock('@/lib/auth/os-sso', () => ({
  ...jest.requireActual('@/lib/auth/os-sso'),
  redirectToOsLogin: () => redirectToOsLogin(),
}));

import { API_BASE } from '@/lib/auth/os-sso';
import type { BotCardDto, ClassDto, ClassMemberDto, JoinCodeDto } from '@/lib/api/classbot-dto';
import {
  classroomKeys,
  joinFailureMessage,
  useAssignClassBot,
  useClassMembers,
  useCreateClassroom,
  useClassDetail,
  useIssueJoinCode,
  useJoinByCode,
  useMyClassrooms,
  useOperatorClass,
  useOperatorClasses,
} from '../classroom';

const BASE = `${API_BASE}/classbot`;

interface Call {
  url: string;
  method: string;
  body?: unknown;
  headers: Record<string, string>;
  credentials?: RequestCredentials;
}
let calls: Call[];
/** 참여 응답 코드 — 201 새로 들어옴 · 200 이미 멤버 · 4xx 실패. */
let enrollStatus: number;
/** 내 반 목록 응답 코드. */
let botsStatus: number;
let bots: BotCardDto[];
/** 교사 — 내가 operator 인 반 목록 응답 코드와 본문. */
let teacherStatus: number;
let teacherBots: BotCardDto[];
/** 교사 — 반 하나(`GET /bots/:id`) 응답 코드. */
let detailStatus: number;
/** 교사 — 코드 발급 응답 코드. */
let issueStatus: number;
/** 교사 — 반 만들기 응답 코드. */
let createStatus: number;
/** 교사 — 명단 응답 코드와 본문. */
let membersStatus: number;
let members: ClassMemberDto[];
/** 교사 — 봇 할당 응답 코드. */
let assignStatus: number;
/** 교사 — 반 상세(`GET /classes/:classId`) 응답 코드와 본문. */
let classStatus: number;
let classDto: ClassDto;

const JOIN_CODE: JoinCodeDto = {
  id: 'jc_1', code: 'AB3K9M', classId: 'cls_1', createdAt: '2026-09-16T00:00:00.000Z', expiresAt: '2026-09-18T00:00:00.000Z',
};
const CLASS_DTO: ClassDto = {
  id: 'cls_1', operatorId: 'sub-1', orgId: null, name: '고2 미적분 A반', description: null, subject: '수학Ⅱ', grade: '고2',
  isActive: true, bot: null, joinCode: JOIN_CODE, createdAt: '2026-09-16T00:00:00.000Z', updatedAt: '2026-09-16T00:00:00.000Z',
};
const BOT_SUMMARY = { id: 'bot_1', name: '문학 도우미', avatarEmoji: '📚' };

function res(status: number, body: unknown): Response {
  return {
    ok: status >= 200 && status < 300,
    status,
    text: async () => JSON.stringify(body),
    json: async () => body,
  } as unknown as Response;
}

function fakeFetch(input: RequestInfo | URL, init?: RequestInit): Promise<Response> {
  const url = String(input);
  const method = init?.method ?? 'GET';
  const headers = { ...((init?.headers as Record<string, string> | undefined) ?? {}) };
  const body = init?.body ? (JSON.parse(String(init.body)) as unknown) : undefined;
  calls.push({ url, method, body, headers, credentials: init?.credentials });

  if (url === `${API_BASE}/auth/csrf`) return Promise.resolve(res(200, { csrfToken: 'csrf-1' }));

  if (url === `${BASE}/enrollments` && method === 'POST') {
    if (enrollStatus >= 400) {
      return Promise.resolve(res(enrollStatus, { statusCode: enrollStatus, message: 'nope' }));
    }
    return Promise.resolve(
      res(enrollStatus, {
        membershipId: 'mem_1',
        classId: 'cls_1',
        memberId: 'sub-1',
        enrolledAt: '2026-09-16T00:00:00.000Z',
      }),
    );
  }
  if (url === `${BASE}/bots/cls_1` && method === 'GET') {
    if (detailStatus >= 400) return Promise.resolve(res(detailStatus, { statusCode: detailStatus, message: 'nope' }));
    return Promise.resolve(
      res(200, { id: 'cls_1', name: '고2 미적분 A반', description: null, isActive: true, operatorId: 't1', profile: null }),
    );
  }
  if (url === `${BASE}/bots?role=student` && method === 'GET') {
    if (botsStatus >= 400) return Promise.resolve(res(botsStatus, { statusCode: botsStatus, message: 'nope' }));
    return Promise.resolve(res(200, bots));
  }
  if (url === `${BASE}/bots?role=teacher` && method === 'GET') {
    if (teacherStatus >= 400) return Promise.resolve(res(teacherStatus, { statusCode: teacherStatus, message: 'nope' }));
    return Promise.resolve(res(200, teacherBots));
  }
  if (url === `${BASE}/classes/cls_1/join-codes` && method === 'POST') {
    if (issueStatus >= 400) return Promise.resolve(res(issueStatus, { statusCode: issueStatus, message: 'nope' }));
    return Promise.resolve(res(201, { ...JOIN_CODE, id: 'jc_2', code: 'ZZ9Q2R' }));
  }
  if (url === `${BASE}/classes` && method === 'POST') {
    if (createStatus >= 400) return Promise.resolve(res(createStatus, { statusCode: createStatus, message: 'nope' }));
    const input = body as { name: string; subject?: string; grade?: string };
    return Promise.resolve(
      res(201, {
        class: { ...CLASS_DTO, name: input.name, subject: input.subject ?? null, grade: input.grade ?? null },
        joinCode: JOIN_CODE,
      }),
    );
  }
  if (url === `${BASE}/classes/cls_1` && method === 'GET') {
    if (classStatus >= 400) return Promise.resolve(res(classStatus, { statusCode: classStatus, message: 'nope' }));
    return Promise.resolve(res(200, classDto));
  }
  if (url === `${BASE}/classes/cls_1/members` && method === 'GET') {
    if (membersStatus >= 400) return Promise.resolve(res(membersStatus, { statusCode: membersStatus, message: 'nope' }));
    return Promise.resolve(res(200, members));
  }
  if (url === `${BASE}/classes/cls_1/bot` && method === 'PUT') {
    if (assignStatus >= 400) return Promise.resolve(res(assignStatus, { statusCode: assignStatus, message: 'nope' }));
    const input = body as { botId: string | null };
    return Promise.resolve(res(200, { ...CLASS_DTO, bot: input.botId ? { ...BOT_SUMMARY, id: input.botId } : null }));
  }
  return Promise.resolve(res(404, { statusCode: 404, message: 'not found' }));
}

const botsCalls = () => calls.filter((c) => c.url === `${BASE}/bots?role=student`);
const teacherCalls = () => calls.filter((c) => c.url === `${BASE}/bots?role=teacher`);
const issueCalls = () => calls.filter((c) => c.method === 'POST' && c.url === `${BASE}/classes/cls_1/join-codes`);
const createCalls = () => calls.filter((c) => c.method === 'POST' && c.url === `${BASE}/classes`);
const memberCalls = () => calls.filter((c) => c.url === `${BASE}/classes/cls_1/members`);
const assignCalls = () => calls.filter((c) => c.method === 'PUT' && c.url === `${BASE}/classes/cls_1/bot`);
const classCalls = () => calls.filter((c) => c.method === 'GET' && c.url === `${BASE}/classes/cls_1`);

let queryClient: QueryClient;
function Wrapper({ children }: { children: ReactNode }) {
  return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
}

beforeEach(() => {
  authUser = { id: 'sub-1' };
  authReady = true;
  calls = [];
  enrollStatus = 201;
  botsStatus = 200;
  bots = [{ id: 'cls_1', name: '고2 미적분 A반', description: null, isActive: true, role: 'student', profile: null }];
  teacherStatus = 200;
  teacherBots = [{ id: 'cls_1', name: '고2 미적분 A반', description: null, isActive: true, role: 'teacher', profile: null }];
  detailStatus = 200;
  issueStatus = 201;
  createStatus = 201;
  membersStatus = 200;
  members = [
    { membershipId: 'mem_1', memberId: 'stu_1', displayName: '김학생', enrolledAt: '2026-09-10T00:00:00.000Z', isActive: true, lastActiveAt: null },
  ];
  assignStatus = 200;
  classStatus = 200;
  classDto = CLASS_DTO;
  redirectToOsLogin.mockReset();
  queryClient = new QueryClient({
    defaultOptions: { queries: { retryDelay: 0, gcTime: Infinity }, mutations: { retry: false } },
  });
  global.fetch = jest.fn(fakeFetch) as unknown as typeof fetch;
});

afterEach(() => {
  queryClient.clear();
});

describe('useJoinByCode — POST /classbot/enrollments', () => {
  it('OS 쿠키(credentials include) + CSRF double-submit 으로 { code } 를 보낸다', async () => {
    const { result } = renderHook(() => useJoinByCode(), { wrapper: Wrapper });

    let joined: Awaited<ReturnType<typeof result.current.mutateAsync>> | undefined;
    await act(async () => {
      joined = await result.current.mutateAsync({ code: 'AB3K9M' });
    });

    const post = calls.find((c) => c.method === 'POST' && c.url === `${BASE}/enrollments`);
    expect(post).toBeDefined();
    expect(post?.body).toEqual({ code: 'AB3K9M' });
    expect(post?.credentials).toBe('include');
    expect(post?.headers['X-CSRF-Token']).toBe('csrf-1');
    expect(post?.headers.Authorization).toBeUndefined();
    expect(post?.headers['x-user-id']).toBeUndefined();

    expect(joined).toEqual({
      enrollment: { membershipId: 'mem_1', classId: 'cls_1', memberId: 'sub-1', enrolledAt: '2026-09-16T00:00:00.000Z' },
      className: '고2 미적분 A반',
      alreadyJoined: false,
    });
  });

  it('200 이면 이미 멤버(멱등) — alreadyJoined:true, 오류가 아니다', async () => {
    enrollStatus = 200;
    const { result } = renderHook(() => useJoinByCode(), { wrapper: Wrapper });
    let joined: { alreadyJoined: boolean } | undefined;
    await act(async () => {
      joined = await result.current.mutateAsync({ code: 'AB3K9M' });
    });
    expect(joined?.alreadyJoined).toBe(true);
  });

  it('반 이름을 못 읽어도 참여는 성공이다 — className 만 null', async () => {
    global.fetch = jest.fn((input: RequestInfo | URL, init?: RequestInit) => {
      if (String(input) === `${BASE}/bots/cls_1`) return Promise.resolve(res(500, { statusCode: 500 }));
      return fakeFetch(input, init);
    }) as unknown as typeof fetch;

    const { result } = renderHook(() => useJoinByCode(), { wrapper: Wrapper });
    let joined: { className: string | null } | undefined;
    await act(async () => {
      joined = await result.current.mutateAsync({ code: 'AB3K9M' });
    });
    expect(joined?.className).toBeNull();
  });

  it('성공하면 내 반 목록을 다시 읽는다(무효화)', async () => {
    const { result } = renderHook(
      () => ({ rooms: useMyClassrooms(), join: useJoinByCode() }),
      { wrapper: Wrapper },
    );
    await waitFor(() => expect(result.current.rooms.data).toHaveLength(1));
    const before = botsCalls().length;

    await act(async () => {
      await result.current.join.mutateAsync({ code: 'AB3K9M' });
    });
    await waitFor(() => expect(botsCalls().length).toBeGreaterThan(before));
  });

  it.each([
    [404, '없는 코드예요. 선생님께 받은 참여 코드를 다시 확인해 주세요.'],
    [410, '닫힌 코드예요. 선생님께 새 코드를 받아 주세요.'],
    [409, '이미 들어와 있는 반이에요.'],
    [403, '이 반에는 들어갈 수 없어요.'],
    [500, '참여하지 못했어요. 잠시 후 다시 시도해 주세요.'],
  ])('%s 는 실패로 끝나고 서버가 가른 뜻을 말한다 — 목 폴백 없음', async (status, message) => {
    enrollStatus = status;
    const { result } = renderHook(() => useJoinByCode(), { wrapper: Wrapper });

    let error: unknown;
    await act(async () => {
      try {
        await result.current.mutateAsync({ code: 'ZZZ' });
      } catch (e) {
        error = e;
      }
    });

    expect(error).toBeDefined();
    expect(joinFailureMessage(error)).toBe(message);
    // 정본 참여 문 하나만 두드렸다 — 같은 오리진 `/api/enrollments` 도, 다른 BE 도 없다.
    expect(calls.filter((c) => c.method === 'POST').map((c) => c.url)).toEqual([`${BASE}/enrollments`]);
    expect(redirectToOsLogin).not.toHaveBeenCalled();
  });

  it('401 이면 OS 로그인으로 보낸다', async () => {
    enrollStatus = 401;
    const { result } = renderHook(() => useJoinByCode(), { wrapper: Wrapper });
    await act(async () => {
      await result.current.mutateAsync({ code: 'ZZZ' }).catch(() => undefined);
    });
    expect(redirectToOsLogin).toHaveBeenCalledTimes(1);
  });
});

describe('useMyClassrooms — GET /classbot/bots?role=student', () => {
  it('OS 쿠키로 읽고 CSRF 는 붙이지 않는다 · 응답은 봉투 없는 카드 배열', async () => {
    const { result } = renderHook(() => useMyClassrooms(), { wrapper: Wrapper });
    await waitFor(() => expect(result.current.data).toEqual(bots));

    const get = botsCalls()[0];
    expect(get.method).toBe('GET');
    expect(get.credentials).toBe('include');
    expect(get.headers['X-CSRF-Token']).toBeUndefined();
    expect(calls.some((c) => c.url === `${API_BASE}/auth/csrf`)).toBe(false);
  });

  it('세션 복원 전에는 묻지 않는다 — 누구 것인지 몰라 캐시가 남의 키에 남는다', async () => {
    authReady = false;
    authUser = null;
    const { result } = renderHook(() => useMyClassrooms(), { wrapper: Wrapper });
    expect(result.current.isPending).toBe(true);
    await act(async () => Promise.resolve());
    expect(botsCalls()).toHaveLength(0);
  });

  it('복원 뒤 비로그인이면 묻지 않는다 — RoleGuard 가 로그인으로 보내는 중이다', async () => {
    authUser = null;
    renderHook(() => useMyClassrooms(), { wrapper: Wrapper });
    await act(async () => Promise.resolve());
    expect(botsCalls()).toHaveLength(0);
  });

  it('4xx 는 다시 보내지 않고, 401 은 로그인으로 보낸다', async () => {
    botsStatus = 401;
    const { result } = renderHook(() => useMyClassrooms(), { wrapper: Wrapper });
    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(botsCalls()).toHaveLength(1);
    expect(redirectToOsLogin).toHaveBeenCalledTimes(1);
  });

  it('5xx 는 한 번 더 시도한 뒤 isError', async () => {
    botsStatus = 503;
    const { result } = renderHook(() => useMyClassrooms(), { wrapper: Wrapper });
    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(botsCalls()).toHaveLength(2);
    expect(redirectToOsLogin).not.toHaveBeenCalled();
  });

  it('신원이 바뀌면 캐시가 갈린다(queryKey 꼬리)', async () => {
    const { result, rerender } = renderHook(() => useMyClassrooms(), { wrapper: Wrapper });
    await waitFor(() => expect(result.current.data).toHaveLength(1));

    authUser = { id: 'sub-2' };
    bots = [];
    rerender();
    await waitFor(() => expect(result.current.data).toEqual([]));
    expect(botsCalls()).toHaveLength(2);
  });
});

/*
  교사 — 계획 PR 5a 가 정본으로 옮긴 셋 + 5b 가 pullim-api PR 2 의 새 문에 붙인 셋. 같은 오리진
  `/api/teacher/classrooms*` 를 더는 두드리지 않는 것을 URL 로 못박는다 — 화면 훅이 두 세계의 반 id 를 섞으면
  코드는 나오는데 학생이 못 들어온다.
*/
describe('useOperatorClasses — GET /classbot/bots?role=teacher', () => {
  it('OS 쿠키로 읽고 CSRF 는 붙이지 않는다 · 응답은 봉투 없는 카드 배열', async () => {
    const { result } = renderHook(() => useOperatorClasses(), { wrapper: Wrapper });
    await waitFor(() => expect(result.current.data).toEqual(teacherBots));

    const get = teacherCalls()[0];
    expect(get.method).toBe('GET');
    expect(get.credentials).toBe('include');
    expect(get.headers['X-CSRF-Token']).toBeUndefined();
    // 같은 오리진 교사 라우트는 두드리지 않았다.
    expect(calls.some((c) => c.url.includes('/api/teacher/classrooms'))).toBe(false);
  });

  it('세션 복원 전·비로그인에는 묻지 않는다', async () => {
    authReady = false;
    authUser = null;
    renderHook(() => useOperatorClasses(), { wrapper: Wrapper });
    await act(async () => Promise.resolve());
    expect(teacherCalls()).toHaveLength(0);
  });

  it('401 은 다시 보내지 않고 로그인으로 보낸다', async () => {
    teacherStatus = 401;
    const { result } = renderHook(() => useOperatorClasses(), { wrapper: Wrapper });
    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(teacherCalls()).toHaveLength(1);
    expect(redirectToOsLogin).toHaveBeenCalledTimes(1);
  });
});

describe('useOperatorClass — GET /classbot/bots/:id', () => {
  it('반 하나를 읽는다 — 상세 머리가 목록 없이 선다', async () => {
    const { result } = renderHook(() => useOperatorClass('cls_1'), { wrapper: Wrapper });
    await waitFor(() => expect(result.current.data?.name).toBe('고2 미적분 A반'));
    expect(calls.filter((c) => c.url === `${BASE}/bots/cls_1`)).toHaveLength(1);
  });

  it('id 가 비면 묻지 않는다', async () => {
    renderHook(() => useOperatorClass(null), { wrapper: Wrapper });
    await act(async () => Promise.resolve());
    expect(calls.filter((c) => c.url.startsWith(`${BASE}/bots/`))).toHaveLength(0);
  });

  it('남의 반(403)은 재시도 없이 실패로 끝난다 — 로그인으로 보내지 않는다', async () => {
    detailStatus = 403;
    const { result } = renderHook(() => useOperatorClass('cls_1'), { wrapper: Wrapper });
    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(result.current.error?.status).toBe(403);
    expect(calls.filter((c) => c.url === `${BASE}/bots/cls_1`)).toHaveLength(1);
    expect(redirectToOsLogin).not.toHaveBeenCalled();
  });
});

describe('useIssueJoinCode — POST /classbot/classes/:classId/join-codes', () => {
  it('빈 본문을 CSRF double-submit 으로 보내고 새 코드(만료 포함)를 돌려준다', async () => {
    const { result } = renderHook(() => useIssueJoinCode(), { wrapper: Wrapper });

    let issued: Awaited<ReturnType<typeof result.current.mutateAsync>> | undefined;
    await act(async () => {
      issued = await result.current.mutateAsync({ classId: 'cls_1' });
    });

    const post = issueCalls()[0];
    expect(post).toBeDefined();
    expect(post.body).toEqual({});
    expect(post.credentials).toBe('include');
    expect(post.headers['X-CSRF-Token']).toBe('csrf-1');
    expect(issued).toEqual({ ...JOIN_CODE, id: 'jc_2', code: 'ZZ9Q2R' });
    expect(calls.some((c) => c.url.includes('/api/teacher/classrooms'))).toBe(false);
  });

  it('반 상세 캐시가 이 반을 들고 있으면 그 joinCode 도 새 코드로 갈아 끼운다 — 안 들고 있으면 만들지 않는다', async () => {
    const { result } = renderHook(
      () => ({ issue: useIssueJoinCode(), known: useClassDetail('cls_1'), other: useClassDetail('cls_2') }),
      { wrapper: Wrapper },
    );
    await waitFor(() => expect(result.current.known.data?.joinCode?.code).toBe('AB3K9M'));

    await act(async () => {
      await result.current.issue.mutateAsync({ classId: 'cls_1' });
    });
    await waitFor(() => expect(result.current.known.data?.joinCode?.code).toBe('ZZ9Q2R'));
    expect(result.current.known.data?.name).toBe('고2 미적분 A반');
    // `cls_2` 는 fakeFetch 가 404 로 답한다 — 없는 반의 캐시를 코드 발급이 지어내지 않는다.
    expect(result.current.other.data).toBeUndefined();
  });

  it('남의 반(403)은 실패로 끝난다 — 코드를 지어내지 않는다', async () => {
    issueStatus = 403;
    const { result } = renderHook(() => useIssueJoinCode(), { wrapper: Wrapper });
    let error: unknown;
    await act(async () => {
      try {
        await result.current.mutateAsync({ classId: 'cls_1' });
      } catch (e) {
        error = e;
      }
    });
    expect((error as { status?: number }).status).toBe(403);
    expect(redirectToOsLogin).not.toHaveBeenCalled();
  });

  it('401 이면 OS 로그인으로 보낸다', async () => {
    issueStatus = 401;
    const { result } = renderHook(() => useIssueJoinCode(), { wrapper: Wrapper });
    await act(async () => {
      await result.current.mutateAsync({ classId: 'cls_1' }).catch(() => undefined);
    });
    expect(redirectToOsLogin).toHaveBeenCalledTimes(1);
  });
});

describe('useCreateClassroom — POST /classbot/classes', () => {
  it('이름만 필수 — 본문을 그대로 CSRF 로 보내고 201 { class, joinCode } 를 돌려준다', async () => {
    const { result } = renderHook(() => useCreateClassroom(), { wrapper: Wrapper });

    let created: Awaited<ReturnType<typeof result.current.mutateAsync>> | undefined;
    await act(async () => {
      created = await result.current.mutateAsync({ name: '고1 국어 B반', subject: '국어' });
    });

    const post = createCalls()[0];
    expect(post.body).toEqual({ name: '고1 국어 B반', subject: '국어' });
    expect(post.credentials).toBe('include');
    expect(post.headers['X-CSRF-Token']).toBe('csrf-1');
    expect(created?.class.name).toBe('고1 국어 B반');
    expect(created?.class.grade).toBeNull();
    expect(created?.joinCode).toEqual(JOIN_CODE);
    // 같은 오리진 `POST /api/teacher/classrooms` 는 두드리지 않는다.
    expect(calls.some((c) => c.url.includes('/api/teacher/classrooms'))).toBe(false);
  });

  it('성공하면 정본 반 목록을 다시 읽고, 돌아온 class 가 반 상세 캐시에 선다(첫 코드가 거기 있다)', async () => {
    // 반 상세를 **구독하지 않은 채로** 만든다 — 만들기 응답이 그 자리를 채우는지 보려는 것이라 미리 읽지 않는다.
    const { result } = renderHook(
      () => ({ rooms: useOperatorClasses(), create: useCreateClassroom() }),
      { wrapper: Wrapper },
    );
    await waitFor(() => expect(result.current.rooms.data).toHaveLength(1));
    const before = teacherCalls().length;

    await act(async () => {
      await result.current.create.mutateAsync({ name: '새 반' });
    });
    await waitFor(() => expect(teacherCalls().length).toBeGreaterThan(before));

    const cached = queryClient.getQueryData<ClassDto>([...classroomKeys.classDetail('cls_1'), 'sub-1']);
    expect(cached?.joinCode?.code).toBe('AB3K9M');
    expect(cached?.bot).toBeNull();
    expect(classCalls()).toHaveLength(0);
  });

  it('403(교사 아님) 은 실패로 끝난다 · 401 은 로그인으로', async () => {
    createStatus = 403;
    const { result } = renderHook(() => useCreateClassroom(), { wrapper: Wrapper });
    let error: unknown;
    await act(async () => {
      try {
        await result.current.mutateAsync({ name: 'x' });
      } catch (e) {
        error = e;
      }
    });
    expect((error as { status?: number }).status).toBe(403);
    expect(redirectToOsLogin).not.toHaveBeenCalled();

    createStatus = 401;
    await act(async () => {
      await result.current.mutateAsync({ name: 'x' }).catch(() => undefined);
    });
    expect(redirectToOsLogin).toHaveBeenCalledTimes(1);
  });
});

describe('useClassMembers — GET /classbot/classes/:classId/members', () => {
  it('OS 쿠키로 읽는다 · 응답은 봉투 없는 명단 배열', async () => {
    const { result } = renderHook(() => useClassMembers('cls_1'), { wrapper: Wrapper });
    await waitFor(() => expect(result.current.data).toEqual(members));
    const get = memberCalls()[0];
    expect(get.method).toBe('GET');
    expect(get.credentials).toBe('include');
    expect(get.headers['X-CSRF-Token']).toBeUndefined();
  });

  it('id 가 비거나 세션 복원 전이면 묻지 않는다', async () => {
    renderHook(() => useClassMembers(null), { wrapper: Wrapper });
    authReady = false;
    authUser = null;
    renderHook(() => useClassMembers('cls_1'), { wrapper: Wrapper });
    await act(async () => Promise.resolve());
    expect(memberCalls()).toHaveLength(0);
  });

  it('남의 반(403)·없는 반(404)은 재시도 없이 그 코드로 끝난다', async () => {
    membersStatus = 403;
    const { result } = renderHook(() => useClassMembers('cls_1'), { wrapper: Wrapper });
    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(result.current.error?.status).toBe(403);
    expect(memberCalls()).toHaveLength(1);
    expect(redirectToOsLogin).not.toHaveBeenCalled();
  });
});

describe('useAssignClassBot — PUT /classbot/classes/:classId/bot', () => {
  it('PUT { botId } 를 CSRF 로 보내고 돌아온 반(합성 bot)이 반 상세 캐시에 선다', async () => {
    const { result } = renderHook(
      () => ({ assign: useAssignClassBot(), known: useClassDetail('cls_1') }),
      { wrapper: Wrapper },
    );
    await waitFor(() => expect(result.current.known.data?.bot).toBeNull());

    await act(async () => {
      await result.current.assign.mutateAsync({ classId: 'cls_1', botId: 'bot_1' });
    });

    const put = assignCalls()[0];
    expect(put.method).toBe('PUT');
    expect(put.body).toEqual({ botId: 'bot_1' });
    expect(put.headers['X-CSRF-Token']).toBe('csrf-1');
    await waitFor(() =>
      expect(result.current.known.data?.bot).toEqual({ id: 'bot_1', name: '문학 도우미', avatarEmoji: '📚' }),
    );
  });

  it('{ botId: null } 이 떼기다 — 반 상세의 bot 이 null 로 선다', async () => {
    classDto = { ...CLASS_DTO, bot: BOT_SUMMARY };
    const { result } = renderHook(
      () => ({ assign: useAssignClassBot(), known: useClassDetail('cls_1') }),
      { wrapper: Wrapper },
    );
    await waitFor(() => expect(result.current.known.data?.bot?.id).toBe('bot_1'));

    await act(async () => {
      await result.current.assign.mutateAsync({ classId: 'cls_1', botId: null });
    });
    expect(assignCalls()[0].body).toEqual({ botId: null });
    await waitFor(() => expect(result.current.known.data?.bot).toBeNull());
  });

  it('성공하면 반 목록·반 상세를 다시 읽는다', async () => {
    const { result } = renderHook(
      () => ({ rooms: useOperatorClasses(), detail: useOperatorClass('cls_1'), assign: useAssignClassBot() }),
      { wrapper: Wrapper },
    );
    await waitFor(() => expect(result.current.detail.data).toBeDefined());
    const listBefore = teacherCalls().length;
    const detailBefore = calls.filter((c) => c.url === `${BASE}/bots/cls_1`).length;

    await act(async () => {
      await result.current.assign.mutateAsync({ classId: 'cls_1', botId: 'bot_1' });
    });
    await waitFor(() => expect(teacherCalls().length).toBeGreaterThan(listBefore));
    await waitFor(() => expect(calls.filter((c) => c.url === `${BASE}/bots/cls_1`).length).toBeGreaterThan(detailBefore));
  });

  it('남의 봇(404)·남의 반(403)은 실패로 끝난다 — 반 상세가 든 봇은 그대로다', async () => {
    assignStatus = 404;
    classDto = { ...CLASS_DTO, bot: BOT_SUMMARY };
    const { result } = renderHook(
      () => ({ assign: useAssignClassBot(), known: useClassDetail('cls_1') }),
      { wrapper: Wrapper },
    );
    await waitFor(() => expect(result.current.known.data?.bot?.id).toBe('bot_1'));
    let error: unknown;
    await act(async () => {
      try {
        await result.current.assign.mutateAsync({ classId: 'cls_1', botId: 'bot_x' });
      } catch (e) {
        error = e;
      }
    });
    expect((error as { status?: number }).status).toBe(404);
    expect(result.current.known.data?.bot?.id).toBe('bot_1');
    expect(redirectToOsLogin).not.toHaveBeenCalled();
  });
});

describe('useClassDetail — GET /classbot/classes/:classId', () => {
  it('붙은 봇과 살아 있는 코드를 서버에서 읽는다 — 새로고침해도 「모른다」로 돌아가지 않는다', async () => {
    classDto = { ...CLASS_DTO, bot: BOT_SUMMARY };
    const { result } = renderHook(() => useClassDetail('cls_1'), { wrapper: Wrapper });

    await waitFor(() => expect(result.current.data).toBeDefined());
    expect(classCalls()).toHaveLength(1);
    expect(classCalls()[0].credentials).toBe('include');
    // GET 은 CSRF 를 달지 않는다.
    expect(classCalls()[0].headers['X-CSRF-Token']).toBeUndefined();
    expect(result.current.data?.bot).toEqual(BOT_SUMMARY);
    expect(result.current.data?.joinCode?.code).toBe('AB3K9M');
  });

  it('반 id 가 비면 묻지 않는다', async () => {
    const { result } = renderHook(() => useClassDetail(null), { wrapper: Wrapper });
    await act(async () => Promise.resolve());
    expect(result.current.data).toBeUndefined();
    expect(classCalls()).toHaveLength(0);
  });

  it('봇 없는 반은 bot:null 이다 — 「모른다(undefined)」와 다른 뜻이다', async () => {
    const { result } = renderHook(() => useClassDetail('cls_1'), { wrapper: Wrapper });
    await waitFor(() => expect(result.current.data).toBeDefined());
    expect(result.current.data?.bot).toBeNull();
  });

  it('비소속(403)·없는 반(404)은 실패로 끝나고 로그인으로 보내지 않는다 — data 는 undefined(모른다)', async () => {
    classStatus = 403;
    const { result } = renderHook(() => useClassDetail('cls_1'), { wrapper: Wrapper });
    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(result.current.error?.status).toBe(403);
    expect(result.current.data).toBeUndefined();
    // 4xx 는 다시 보내도 같은 답이다.
    expect(classCalls()).toHaveLength(1);
    expect(redirectToOsLogin).not.toHaveBeenCalled();
  });

  it('401 은 OS 로그인으로 보낸다', async () => {
    classStatus = 401;
    const { result } = renderHook(() => useClassDetail('cls_1'), { wrapper: Wrapper });
    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(redirectToOsLogin).toHaveBeenCalledTimes(1);
  });
});
