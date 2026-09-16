/**
 * 학생 수업방 훅 — pullim-api 정본을 OS 쿠키로 친다(2026-09-16 계획 PR 4).
 *
 * `fetch` 를 통째로 가로채 **HTTP 를 상대로** 본다 — URL·메서드·본문·CSRF·credentials 가 정본 계약
 * (`POST /classbot/enrollments`·`GET /classbot/bots?role=student`)과 어긋나면 여기서 걸린다.
 * 목 폴백이 없다는 것도 여기서 못박는다 — 404 는 「없는 코드」로 끝나고 다른 문을 두드리지 않는다.
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
import type { BotCardDto } from '@/lib/api/classbot-dto';
import {
  joinFailureMessage, useIssueJoinCode, useJoinByCode, useMyClassrooms, useOperatorClass, useOperatorClasses,
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
    return Promise.resolve(
      res(201, { id: 'jc_1', code: 'AB3K9M', classId: 'cls_1', createdAt: '2026-09-16T00:00:00.000Z' }),
    );
  }
  return Promise.resolve(res(404, { statusCode: 404, message: 'not found' }));
}

const botsCalls = () => calls.filter((c) => c.url === `${BASE}/bots?role=student`);
const teacherCalls = () => calls.filter((c) => c.url === `${BASE}/bots?role=teacher`);
const issueCalls = () => calls.filter((c) => c.method === 'POST' && c.url === `${BASE}/classes/cls_1/join-codes`);

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
  교사 셋 — 계획 PR 5a 가 정본으로 옮긴 문(해소 7). 같은 오리진 `/api/teacher/classrooms*` 를 더는
  두드리지 않는 것을 URL 로 못박는다 — 화면 훅이 두 세계의 반 id 를 섞으면 코드는 나오는데 학생이 못 들어온다.
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
  it('빈 본문을 CSRF double-submit 으로 보내고 새 코드를 돌려준다', async () => {
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
    expect(issued).toEqual({ id: 'jc_1', code: 'AB3K9M', classId: 'cls_1', createdAt: '2026-09-16T00:00:00.000Z' });
    expect(calls.some((c) => c.url.includes('/api/teacher/classrooms'))).toBe(false);
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
